import type Stripe from 'stripe';
import type { RentalFlow, FlowDependencies } from './rental-flow.js';
/** Called ONLY after Stripe signature verification; return true means never run legacy checkout effects. */
export async function handleCollectionWebhook(session: Stripe.Checkout.Session, flow: RentalFlow, locked: FlowDependencies['locked']) {
  const m = session.metadata;
  if (!m?.collection && m?.type !== 'rental_balance') return false;
  if (m?.collection !== 'rental_v1' || !['deposit', 'rental_balance'].includes(m.type) || !/^[1-9]\d*$/.test(m.bookingId ?? '')) throw new Error('Invalid collection metadata');
  const id = Number(m.bookingId);
  if (!Number.isSafeInteger(id)) throw new Error('Invalid booking');
  await locked(id, async s => {
    if (!s.plan || s.booking.bookingRef !== m.bookingRef) throw new Error('Payment booking mismatch');
  });
  await flow.paid(id, session, m.type as 'deposit' | 'rental_balance');
  return true;
}
