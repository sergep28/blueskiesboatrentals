import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { withLegacyBooking } from './booking-financial-guard.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

export interface DepositLink {
  checkoutUrl: string;
  amount: number;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
}

/**
 * The PERMANENT deposit link that goes in customer emails.
 *
 * Stripe Checkout sessions expire in ~24h. Emails used to embed the session URL
 * directly, so a customer who booked three weeks out and went to pay a few days
 * later clicked a dead link — and simply couldn't pay us. This points at our own
 * site instead; the route reuses a verified-open session or replaces one Stripe
 * has verified expired. The site link itself does not expire.
 */
export function depositPayUrl(bookingRef: string): string {
  const appUrl = process.env.APP_URL || 'https://www.blueskiesboatrentals.com';
  return `${appUrl}/deposit/${bookingRef}`;
}

// The base attempt is permanent: enrollment still sees it even after a session
// expires. A verified expired session gets a new, separately reserved generation.
const attemptKey = (id: number, generation: number) =>
  `legacy-deposit-${id}${generation ? `-${generation}` : ''}`;

export async function createDepositLink(bookingId: number, amount?: number): Promise<DepositLink> {
  if (!stripe) throw new Error('Stripe is not configured on the server.');

  const prepare = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId));
    if (!booking || booking.status === 'cancelled' || !['none', 'requested'].includes(booking.depositStatus)) throw new Error('Deposit unavailable or already settled');
    if (booking.depositPaymentIntentId || booking.depositStripeEventId || booking.depositPaidAt)
      throw new Error('Deposit payment evidence requires manual reconciliation');
    const cents = Math.round((amount ?? booking.depositAmount ?? 1000) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Invalid deposit amount');
    const [boat] = await tx.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));
    // Persist every Stripe request input, including the base URL, so a retry with
    // the SAME key cannot silently change price, recipient or checkout metadata.
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const payload = JSON.stringify({ cents, email: booking.customerEmail, boat: boat?.name ?? 'Vessel',
      date: booking.charterDate, ref: booking.bookingRef, appUrl });
    return { booking, payload, cents, boatName: boat?.name ?? 'Vessel', appUrl };
  };
  const first = await withLegacyBooking(bookingId, async tx => {
    const details = await prepare(tx);
    const [saved] = await tx.select().from(schema.legacyDepositCheckouts)
      .where(eq(schema.legacyDepositCheckouts.bookingId, bookingId));
    if (!saved) {
      // Pre-migration bookings may have a live Checkout, but no new ledger row.
      // Verify Stripe before claiming it; a missing/ambiguous session must not
      // silently become a second payable checkout.
      let historical: Stripe.Checkout.Session | undefined;
      if (details.booking.depositStripeSessionId) {
        historical = await stripe.checkout.sessions.retrieve(details.booking.depositStripeSessionId, { expand: [] }, { timeout: 15000 });
        if (historical.id !== details.booking.depositStripeSessionId) throw new Error('Legacy deposit session requires manual reconciliation');
        if (historical.payment_status === 'paid') throw new Error('Deposit payment awaiting verification; do not create another charge');
        if (historical.status !== 'expired' || historical.payment_status !== 'unpaid') {
          if (historical.status !== 'open' || historical.payment_status !== 'unpaid' || !historical.url ||
            historical.mode !== 'payment' || historical.amount_total !== details.cents || historical.currency !== 'usd' ||
            historical.customer_email !== details.booking.customerEmail || historical.metadata?.type !== 'deposit' ||
            historical.metadata?.bookingId !== String(bookingId) || historical.metadata?.bookingRef !== details.booking.bookingRef) {
            throw new Error('Legacy deposit session requires manual reconciliation');
          }
        }
      }
      // An old reservation without metadata cannot be retried safely. Never clear it.
      const reservation = await tx.execute(sql`INSERT INTO rental_checkout_attempts (key)
        VALUES (${attemptKey(bookingId, 0)}) ON CONFLICT DO NOTHING RETURNING key`);
      if (!reservation.rows.length) throw new Error('Legacy deposit attempt requires manual reconciliation');
      await tx.insert(schema.legacyDepositCheckouts).values({ bookingId, payload: details.payload,
        sessionId: historical?.status === 'open' ? historical.id : null });
      if (historical?.status === 'open') return { ...details, url: historical.url! };
    } else {
      if (saved.sessionId && details.booking.depositStripeSessionId !== saved.sessionId)
        throw new Error('Legacy deposit session disagreement requires manual reconciliation');
      if (saved.payload !== details.payload) throw new Error('Deposit checkout details changed; manual reconciliation required');
      if (saved.sessionId) {
        const session = await stripe.checkout.sessions.retrieve(saved.sessionId, { expand: [] }, { timeout: 15000 });
        if (session.id !== saved.sessionId) throw new Error('Legacy deposit session requires manual reconciliation');
        if (session.payment_status === 'paid') throw new Error('Deposit payment awaiting verification; do not create another charge');
        if (session.status === 'open' && session.payment_status === 'unpaid' && session.url) return { ...details, url: session.url };
        if (session.status !== 'expired' || session.payment_status !== 'unpaid') throw new Error('Deposit payment awaiting verification; do not create another charge');
        // Stripe has confirmed that this session cannot be paid anymore. Reserve
        // the next key and commit it BEFORE asking Stripe for another checkout.
        const generation = saved.generation + 1;
        await tx.execute(sql`INSERT INTO rental_checkout_attempts (key) VALUES (${attemptKey(bookingId, generation)})`);
        await tx.update(schema.legacyDepositCheckouts).set({ generation, sessionId: null })
          .where(eq(schema.legacyDepositCheckouts.bookingId, bookingId));
      }
    }
    return details;
  });
  const result = 'url' in first ? first : await withLegacyBooking(bookingId, async tx => {
    const details = await prepare(tx);
    const [saved] = await tx.select().from(schema.legacyDepositCheckouts)
      .where(eq(schema.legacyDepositCheckouts.bookingId, bookingId));
    if (!saved || details.payload !== saved.payload) throw new Error('Deposit checkout details changed; manual reconciliation required');
    if (saved.sessionId && details.booking.depositStripeSessionId !== saved.sessionId)
      throw new Error('Legacy deposit session disagreement requires manual reconciliation');
    if (saved.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(saved.sessionId, { expand: [] }, { timeout: 15000 });
      if (session.id !== saved.sessionId) throw new Error('Legacy deposit session requires manual reconciliation');
      if (session.payment_status !== 'unpaid' || session.status !== 'open' || !session.url) throw new Error('Deposit payment awaiting verification; do not create another charge');
      return { ...details, url: session.url };
    }
    // A previously recorded booking session can outlive a missing ledger ID
    // (including the gap between expiration rotation and the provider call).
    // Only Stripe's explicit expired+unpaid evidence permits a new attempt.
    if (details.booking.depositStripeSessionId) {
      const previous = await stripe.checkout.sessions.retrieve(details.booking.depositStripeSessionId, { expand: [] }, { timeout: 15000 });
      if (previous.id !== details.booking.depositStripeSessionId || previous.status !== 'expired' || previous.payment_status !== 'unpaid')
        throw new Error('Legacy deposit session requires manual reconciliation');
    }
    const key = attemptKey(bookingId, saved.generation);
    const age = await tx.execute(sql`SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at::timestamptz)) AS seconds
      FROM rental_checkout_attempts WHERE key = ${key}`);
    if (!age.rows.length || Number(age.rows[0].seconds) >= 23 * 60 * 60) {
      throw new Error('Ambiguous legacy deposit attempt requires manual reconciliation');
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], customer_email: details.booking.customerEmail,
      line_items: [{ price_data: { currency: 'usd', unit_amount: details.cents,
        product_data: { name: 'Refundable Security Deposit',
          description: `${details.boatName} · ${details.booking.charterDate} · Trip ${details.booking.bookingRef}` } }, quantity: 1 }],
      mode: 'payment',
      success_url: `${details.appUrl}/booking/success/${details.booking.bookingRef}?deposit=1`,
      cancel_url: `${details.appUrl}/`,
      metadata: { type: 'deposit', bookingRef: details.booking.bookingRef, bookingId: String(details.booking.id) },
    }, { idempotencyKey: key, timeout: 15000 });
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    await tx.update(schema.legacyDepositCheckouts).set({ sessionId: session.id })
      .where(eq(schema.legacyDepositCheckouts.bookingId, bookingId));
    await tx.update(schema.bookings).set({ depositStatus: 'requested',
      depositAmount: details.cents / 100, depositStripeSessionId: session.id,
      updatedAt: new Date().toISOString() }).where(eq(schema.bookings.id, bookingId));
    return { ...details, url: session.url };
  });
  return { checkoutUrl: result.url, amount: result.cents / 100,
    bookingRef: result.booking.bookingRef, customerName: result.booking.customerName,
    customerEmail: result.booking.customerEmail };
}
