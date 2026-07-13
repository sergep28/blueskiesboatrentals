import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

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

// Stripe Checkout URLs expire in ~24h, so the URL is never persisted —
// regenerate to get a fresh one.
export async function createDepositLink(bookingId: number, amount?: number): Promise<DepositLink> {
  if (!stripe) throw new Error('Stripe is not configured on the server.');

  const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId));
  if (!booking) throw new Error('Booking not found.');

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
  });

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
