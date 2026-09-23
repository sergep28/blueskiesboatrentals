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
 * site instead; the route mints a FRESH Stripe session at the moment they click.
 * It never expires.
 */
export function depositPayUrl(bookingRef: string): string {
  const appUrl = process.env.APP_URL || 'https://www.blueskiesboatrentals.com';
  return `${appUrl}/deposit/${bookingRef}`;
}

// Stripe Checkout URLs expire in ~24h, so the URL is never persisted —
// regenerate to get a fresh one.
export async function createDepositLink(bookingId: number, amount?: number): Promise<DepositLink> {
  if (!stripe) throw new Error('Stripe is not configured on the server.');

  // Commit a permanent fail-closed reservation BEFORE contacting Stripe. Neither
  // rollback nor timeout can make this booking eligible for another payment flow.
  const booking = await withLegacyBooking(bookingId, async tx => {
    const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId));
    if (!b || b.status === 'cancelled' || !['none', 'requested'].includes(b.depositStatus)) throw new Error('Deposit unavailable or already settled');
    const cents = Math.round((amount ?? b.depositAmount ?? 1000) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Invalid deposit amount');
    const key = `legacy-deposit-${bookingId}`;
    const reservation = await tx.execute(sql`INSERT INTO rental_checkout_attempts (key) VALUES (${key}) ON CONFLICT DO NOTHING RETURNING key`);
    if (!reservation.rows.length) throw new Error('Legacy deposit attempt requires manual reconciliation; do not create another charge');
    return b;
  });

  const depositAmount = amount ?? booking.depositAmount ?? 1000;
  const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: booking.customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Refundable Security Deposit',
          description: `${boat?.name ?? 'Vessel'} · ${booking.charterDate} · Trip ${booking.bookingRef}`,
        },
        unit_amount: Math.round(depositAmount * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${appUrl}/booking/success/${booking.bookingRef}?deposit=1`,
    cancel_url: `${appUrl}/`,
    metadata: {
      type: 'deposit',
      bookingRef: booking.bookingRef,
      bookingId: String(booking.id),
    },
  }, { idempotencyKey: `legacy-deposit-${bookingId}`, timeout: 15000 });

  if (!session.url) throw new Error('Stripe did not return a checkout URL.');

  await db.update(schema.bookings).set({
    depositStatus: 'requested',
    depositAmount: depositAmount,
    depositStripeSessionId: session.id,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.bookings.id, booking.id));

  return {
    checkoutUrl: session.url,
    amount: depositAmount,
    bookingRef: booking.bookingRef,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
  };
}
