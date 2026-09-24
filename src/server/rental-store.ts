import type { Pool, PoolClient } from 'pg';
export type CreateCollectionBooking = (client: PoolClient) => Promise<number>;
export interface CollectionCreation { create: CreateCollectionBooking; requestKey: string; requestHash: string }
import type { CollectionState } from './rental-flow.js';

/** All collection transitions serialize on the booking row, including first enrollment.
 * State/ledger/booking/stats/referral writes commit together. No read-then-write event dedupe.
 * Provider calls occur while locked; Stripe attempt keys are reserved separately (see runtime).
 */
export function createRentalStore(pool: Pick<Pool, 'connect'>) {
  return { async locked<T>(key: number | string | CollectionCreation, fn: (s: CollectionState) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize retries before any user/booking write, including requests in flight.
      if (typeof key === 'object') {
        const request = key;
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`rental-create:${request.requestKey}`]);
        const existing = await client.query('SELECT request_hash, booking_id FROM rental_creation_requests WHERE request_key = $1', [request.requestKey]);
        if (existing.rows[0]) {
          if (existing.rows[0].request_hash !== request.requestHash) throw new Error('Creation request reused with different input');
          key = existing.rows[0].booking_id;
        } else {
          key = await request.create(client);
          await client.query('INSERT INTO rental_creation_requests (request_key, request_hash, booking_id) VALUES ($1,$2,$3)', [request.requestKey, request.requestHash, key]);
        }
      }
      // Do not lock plan before booking: every entry path must share lock order.
      const result = await client.query(typeof key === 'number'
        ? 'SELECT b.* FROM bookings b WHERE b.id = $1 FOR UPDATE OF b'
        : 'SELECT b.* FROM bookings b JOIN rental_collections r ON r.booking_id = b.id WHERE r.token = $1 FOR UPDATE OF b', [key]);
      const b = result.rows[0];
      if (!b) throw new Error('Collection unavailable');
      const saved = await client.query('SELECT state FROM rental_collections WHERE booking_id = $1 FOR UPDATE', [b.id]);
      const legacy = await client.query('SELECT key FROM rental_checkout_attempts WHERE key = $1', [`legacy-deposit-${b.id}`]);
      const state: CollectionState = { booking: {
        legacyDepositAttempt: legacy.rows.length > 0,
        id: b.id, bookingRef: b.booking_ref, source: b.source, status: b.status,
        paymentStatus: b.payment_status, total: b.total, charterDate: b.charter_date,
        endDate: b.end_date, boatId: b.boat_id, depositStatus: b.deposit_status,
        depositAmount: b.deposit_amount, customerEmail: b.customer_email,
        stripeSessionId: b.stripe_session_id, depositStripeSessionId: b.deposit_stripe_session_id,
      }, plan: saved.rows[0] ? JSON.parse(saved.rows[0].state) : null };
      const value = await fn(state);
      if (state.payment) {
        const p = state.payment;
        // Unique session/intent and (booking,type) constraints provide a second guard.
        await client.query('INSERT INTO rental_payments (session_id, intent_id, booking_id, type) VALUES ($1,$2,$3,$4)', [p.sessionId, p.intentId, b.id, p.type]);
        if (p.type === 'rental_balance') {
          await client.query(`UPDATE bookings SET payment_status = 'paid',
            stripe_payment_id = $2, stripe_session_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [b.id, p.intentId, p.sessionId]);
          if (b.user_id) await client.query(`UPDATE users SET booking_count = booking_count + 1,
            total_spent = total_spent + $2, loyalty_points = loyalty_points + $3,
            updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [b.user_id, b.total, b.loyalty_points_earned ?? 0]);
          if (b.referral_code && b.referral_discount > 0) await client.query(`INSERT INTO referral_transactions (partner_id, booking_id, amount, commission)
            SELECT id, $2, $3::real, round(($3::real::numeric * commission_rate::numeric / 100), 2)
            FROM partners WHERE referral_code = $1`, [b.referral_code, b.id, b.total]);
        } else {
          await client.query(`UPDATE bookings SET deposit_status = 'paid', deposit_paid_at = CURRENT_TIMESTAMP,
            deposit_payment_intent_id = $2, deposit_stripe_session_id = $3,
            updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [b.id, p.intentId, p.sessionId]);
        }
      }
      if (state.plan) await client.query(`INSERT INTO rental_collections (booking_id, token, state) VALUES ($1,$2,$3)
        ON CONFLICT (booking_id) DO UPDATE SET state = EXCLUDED.state`, [b.id, state.plan.token, JSON.stringify(state.plan)]);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } };
}
