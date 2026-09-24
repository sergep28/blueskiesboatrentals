import type { Pool, PoolClient } from 'pg';
import type Stripe from 'stripe';

interface SettlementInput { bookingId: number; deductions: number; deductionsNote?: string }
interface Claim {
  booking_id: number; intent_id: string; paid_cents: number; refund_cents: number;
  deduction_cents: number; note: string | null; provider_key: string;
  refund_id: string | null; state: 'claimed' | 'pending' | 'settled'; created_at: Date;
}

// Same booking -> collection lock order as rental-store and the legacy guard.
async function locked<T>(pool: Pick<Pool, 'connect'>, id: number, fn: (client: PoolClient, booking: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!booking) throw new Error('Booking not found');
    const result = await fn(client, booking);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(value) || Math.abs(value / 100 - amount) > 0.0000001) throw new Error('Invalid deductions amount: cents only');
  return value;
}

/** One immutable, committed claim precedes any refund call. A second booking-row
 * lock serializes reconciliation, provider calls, and completion; a crash/timeout
 * cannot erase the claim or issue a different refund on replay.
 */
export async function settleEnrolledDeposit(pool: Pick<Pool, 'connect'>, stripe: Pick<Stripe, 'paymentIntents' | 'refunds'> | null,
  input: SettlementInput): Promise<{ ok: true; refundAmount: number; deductions: number; newlySettled: boolean }> {
  if (!Number.isSafeInteger(input.bookingId) || input.bookingId <= 0) throw new Error('Invalid booking');
  const deductionCents = cents(input.deductions);
  if (deductionCents < 0) throw new Error('Invalid deductions amount');
  const note = input.deductionsNote?.trim() || null;
  if (note && note.length > 4000) throw new Error('Deductions note too long');

  const claim = await locked(pool, input.bookingId, async (client, booking): Promise<Claim> => {
    const collection = (await client.query('SELECT state FROM rental_collections WHERE booking_id=$1 FOR UPDATE', [input.bookingId])).rows[0];
    if (!collection) throw new Error('Booking is not enrolled');
    const existing = (await client.query('SELECT * FROM enrolled_deposit_refunds WHERE booking_id=$1', [input.bookingId])).rows[0] as Claim | undefined;
    if (existing) {
      if (existing.deduction_cents !== deductionCents || existing.note !== note) throw new Error('Deposit already settled or claimed with different deductions; manual review required');
      if (booking.deposit_status !== 'paid' && existing.state !== 'settled') throw new Error('Deposit status changed; manual review required');
      return existing;
    }
    if (booking.deposit_status !== 'paid') throw new Error('Deposit must be paid before it can be settled');
    const plan = JSON.parse(collection.state);
    if (plan.depositReceived !== true) throw new Error('Deposit not verified by enrolled collection');
    const heldCents = cents(booking.deposit_amount);
    if (heldCents <= 0 || plan.depositCents !== heldCents || deductionCents > heldCents) throw new Error('Deductions exceed approved deposit amount');
    const intentId = booking.deposit_payment_intent_id;
    if (!intentId || !stripe) throw new Error('Card payment evidence or Stripe unavailable; manual review required');
    const ledger = (await client.query("SELECT session_id,intent_id FROM rental_payments WHERE booking_id=$1 AND type='deposit'", [input.bookingId])).rows[0];
    if (ledger && (ledger.intent_id !== intentId || ledger.session_id !== booking.deposit_stripe_session_id)) throw new Error('Deposit payment ledger mismatch; manual review required');
    // Historical paid card deposits can be enrolled without a rental_payments row.
    // The provider amount, currency and status must still be independently verified.
    const payment = await stripe.paymentIntents.retrieve(intentId, {}, { timeout: 15000, maxNetworkRetries: 0 });
    if (payment.id !== intentId || payment.status !== 'succeeded' || payment.currency !== 'usd' || payment.amount_received !== heldCents)
      throw new Error('Provider paid amount does not match approved deposit; manual review required');
    const refundCents = heldCents - deductionCents;
    const key = `enrolled-deposit-refund-${input.bookingId}-${intentId}`;
    return (await client.query(`INSERT INTO enrolled_deposit_refunds
      (booking_id,intent_id,paid_cents,refund_cents,deduction_cents,note,provider_key,state)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'claimed') RETURNING *`,
      [input.bookingId, intentId, heldCents, refundCents, deductionCents, note, key])).rows[0] as Claim;
  });

  if (claim.state === 'settled') return { ok: true, refundAmount: claim.refund_cents / 100, deductions: claim.deduction_cents / 100, newlySettled: false };
  const outcome = await locked(pool, input.bookingId, async (client, booking) => {
    const current = (await client.query('SELECT * FROM enrolled_deposit_refunds WHERE booking_id=$1 FOR UPDATE', [input.bookingId])).rows[0] as Claim;
    if (current.state === 'settled') return 'duplicate';
    if (booking.deposit_status !== 'paid' || booking.deposit_payment_intent_id !== current.intent_id)
      throw new Error('Deposit changed while refund pending; manual review required');
    if (current.refund_cents > 0) {
      if (!stripe) throw new Error('Stripe unavailable; refund claim retained for reconciliation');
      // Paginate ALL refunds on the payment intent. A foreign refund, even a partial
      // one, makes our approved amount unsafe; never issue another refund blindly.
      let startingAfter: string | undefined;
      let matched: Stripe.Refund | undefined;
      for (let page = 0; page < 10; page++) {
        const list = await stripe.refunds.list({ payment_intent: current.intent_id, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) }, { timeout: 15000, maxNetworkRetries: 0 });
        for (const refund of list.data) {
          if (refund.payment_intent !== current.intent_id || refund.metadata?.claim !== current.provider_key || refund.amount !== current.refund_cents)
            throw new Error('Other provider refund exists; manual reconciliation required');
          if (matched && matched.id !== refund.id) throw new Error('Multiple provider refunds exist; manual reconciliation required');
          matched = refund;
        }
        if (!list.has_more) break;
        if (!list.data.length || page === 9) throw new Error('Provider refund history incomplete; manual reconciliation required');
        startingAfter = list.data.at(-1)!.id;
      }
      if (!matched && current.refund_id) throw new Error('Recorded provider refund missing; manual reconciliation required');
      if (!matched) {
        if (Date.now() - new Date(current.created_at).getTime() >= 23 * 60 * 60 * 1000)
          throw new Error('Refund claim older than Stripe idempotency window; manual reconciliation required');
        // Same immutable payload/key on every attempt. Never rotate after ambiguity.
        matched = await stripe.refunds.create({ payment_intent: current.intent_id, amount: current.refund_cents,
          metadata: { claim: current.provider_key, bookingId: String(input.bookingId) } },
          { idempotencyKey: current.provider_key, timeout: 15000, maxNetworkRetries: 0 });
      }
      if (matched.payment_intent !== current.intent_id || matched.amount !== current.refund_cents || !matched.id ||
          matched.metadata?.claim !== current.provider_key) throw new Error('Provider refund evidence mismatch; manual review required');
      if (current.refund_id && current.refund_id !== matched.id) throw new Error('Provider refund changed; manual review required');
      if (matched.status !== 'succeeded') {
        await client.query("UPDATE enrolled_deposit_refunds SET state='pending',refund_id=$2 WHERE booking_id=$1", [input.bookingId, matched.id]);
        return 'pending'; // failed/canceled also require manual review; never create again.
      }
      await client.query("UPDATE enrolled_deposit_refunds SET state='settled',refund_id=$2 WHERE booking_id=$1", [input.bookingId, matched.id]);
    } else {
      await client.query("UPDATE enrolled_deposit_refunds SET state='settled' WHERE booking_id=$1", [input.bookingId]);
    }
    await client.query(`UPDATE bookings SET deposit_status=$2, deposit_refunded_amount=$3,
      deposit_deductions_note=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [input.bookingId, current.deduction_cents > 0 ? 'partially_refunded' : 'refunded', current.refund_cents / 100, current.note]);
    return 'settled';
  });
  if (outcome === 'pending') throw new Error('Provider refund pending or failed; claim retained, reconcile before settlement');
  return { ok: true, refundAmount: claim.refund_cents / 100, deductions: claim.deduction_cents / 100, newlySettled: outcome === 'settled' };
}
