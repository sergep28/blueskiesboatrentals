import type { Pool } from 'pg';
import type Stripe from 'stripe';
import type { FlowDependencies } from './rental-flow.js';
export function createRentalCheckout(pool: Pick<Pool, 'query'>, stripe: Stripe, appUrl: string): FlowDependencies['checkout'] {
  return async request => {
    // Separate committed connection: survives a crash after Stripe accepts but before state COMMIT.
    // Do not retry ambiguous attempts past Stripe's >=24h idempotency-key retention.
    // Pool connection timeout prevents pool exhaustion from hanging locked transactions forever.
    const attempt = await pool.query(`INSERT INTO rental_checkout_attempts (key) VALUES ($1)
      ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
      RETURNING EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at::timestamptz)) AS age_seconds`, [request.idempotencyKey]);
    if (Number(attempt.rows[0]?.age_seconds ?? Infinity) >= 23 * 60 * 60) throw new Error('Ambiguous checkout requires manual review');
    const b = request.booking;
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'], mode: 'payment', customer_email: b.customerEmail,
      line_items: [{ price_data: { currency: 'usd', unit_amount: request.cents,
        product_data: { name: request.type === 'deposit' ? 'Refundable security deposit' : 'Rental balance', description: `Booking ${b.bookingRef}` } }, quantity: 1 }],
      success_url: `${appUrl}/booking/success/${encodeURIComponent(b.bookingRef)}${request.type === 'deposit' ? '?deposit=1' : ''}`,
      cancel_url: `${appUrl}/`,
      metadata: { collection: 'rental_v1', type: request.type, bookingId: String(b.id), bookingRef: b.bookingRef },
    }, { idempotencyKey: request.idempotencyKey, timeout: 15000, maxNetworkRetries: 1 });
  };
}
