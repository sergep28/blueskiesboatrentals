import { eq, sql } from 'drizzle-orm';
import { schema } from '../db/index.js';
import { withLegacyBooking } from './booking-financial-guard.js';

/** Legacy completed-card sessions only. Lock, enrollment exclusion, receipt claim,
 * booking and aggregate effects are one transaction. Notifications happen later.
 */
export async function settleLegacyCheckout(bookingRef: string, session: {
 id: string; payment_intent: unknown; amount_total: number | null; currency: string | null; payment_status: string;
}, eventId: string, deposit: boolean) {
 return withLegacyBooking(bookingRef, async tx => {
  const [b] = await tx.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, bookingRef));
  if (!b) throw new Error('Booking not found');
  const expected = deposit ? b.depositStripeSessionId : b.stripeSessionId;
  const alreadyPaid = deposit ? !['none','requested'].includes(b.depositStatus) : b.paymentStatus !== 'pending';
  if (alreadyPaid) {
   if (expected === session.id && (deposit ? b.depositPaymentIntentId : b.stripePaymentId) === session.payment_intent) return { booking:b, duplicate:true };
   throw new Error('Conflicting legacy settlement requires review');
  }
  if (expected !== session.id || session.payment_status !== 'paid' || typeof session.payment_intent !== 'string' || session.currency !== 'usd' || session.amount_total !== Math.round((deposit ? b.depositAmount : b.total) * 100) || b.status === 'cancelled') throw new Error('Legacy payment evidence requires review');
  const now=new Date().toISOString();
  if (deposit) {
   await tx.update(schema.bookings).set({depositStatus:'paid',depositPaidAt:now,depositPaymentIntentId:session.payment_intent,depositStripeSessionId:session.id,depositStripeEventId:eventId,updatedAt:now}).where(eq(schema.bookings.id,b.id));
  } else {
   await tx.update(schema.bookings).set({paymentStatus:'paid',status:'confirmed',stripePaymentId:session.payment_intent,stripeSessionId:session.id,stripeEventId:eventId,updatedAt:now}).where(eq(schema.bookings.id,b.id));
   if (b.userId) await tx.execute(sql`UPDATE users SET booking_count=booking_count+1, total_spent=total_spent+${b.total}, loyalty_points=loyalty_points+${b.loyaltyPointsEarned ?? 0}, updated_at=${now} WHERE id=${b.userId}`);
   if (b.referralCode && b.referralDiscount > 0) {
    const [partner]=await tx.select().from(schema.partners).where(eq(schema.partners.referralCode,b.referralCode));
    if (partner) await tx.insert(schema.referralTransactions).values({partnerId:partner.id,bookingId:b.id,amount:b.total,commission:Math.round(b.total*partner.commissionRate)/100});
   }
  }
  return { booking:b, duplicate:false };
 });
}
