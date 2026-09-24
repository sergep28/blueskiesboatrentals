import { rentalDeadline } from './rental-policy.js';
export interface RentalBooking {
  id: number; bookingRef: string; source: string; status: string; paymentStatus: string;
  total: number; charterDate: string; depositStatus: string; depositAmount: number;
  customerEmail: string; endDate?: string | null; boatId?: number;
  legacyDepositAttempt?: boolean;
  stripeSessionId?: string | null; depositStripeSessionId?: string | null;
}
export function outstandingRentalCents(b: RentalBooking, plan: RentalPlan): number {
  const eligible = authorizeCollection(b, plan.mode, true);
  if (eligible.rentalCents !== plan.rentalCents) throw new Error('Authorized rental amount changed; manual review required');
  return plan.rentalCents;
}
export function verifyCollectionPayment(session: { id: string; payment_status: string; currency: string | null; amount_total: number | null; payment_intent: unknown }, expectedSession: string, cents: number): string {
  if (session.id !== expectedSession || session.payment_status !== 'paid' || session.currency !== 'usd' || session.amount_total !== cents || typeof session.payment_intent !== 'string') {
    throw new Error('Payment evidence does not match authorized charge');
  }
  return session.payment_intent;
}
export interface RentalPlan {
  mode: 'deposit_first' | 'upfront'; rentalCents: number; dueDate: string;
}
// Deliberate allowlist: unknown/historical sources require manual review, never guesses from notes.
export function authorizeCollection(b: RentalBooking, mode: RentalPlan['mode'], isAdmin: boolean, now = new Date()): RentalPlan {
  if (!isAdmin) throw new Error('Admin login required');
  if (!['direct', 'phone', 'walkin'].includes(b.source)) throw new Error('Only verified direct sources are eligible');
  if (b.status === 'cancelled' || b.paymentStatus !== 'pending') throw new Error('Booking is not eligible for rental collection');
  const rentalCents = Math.round(b.total * 100);
  if (!Number.isSafeInteger(rentalCents) || rentalCents <= 0) throw new Error('Invalid rental amount');
  return { mode, rentalCents, dueDate: rentalDeadline(b.charterDate, now).dueDate };
}
