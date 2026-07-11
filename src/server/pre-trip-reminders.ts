import { and, eq, ne, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { sendPreTripReminder } from './email.js';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

// Tomorrow's date (YYYY-MM-DD) in Eastern time.
function easternTomorrow(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  eastern.setDate(eastern.getDate() + 1);
  return eastern.toISOString().split('T')[0];
}

// Send pre-trip reminders for bookings happening tomorrow. Idempotent:
// each booking is stamped (pre_trip_reminder_at) once sent.
export async function sendPendingPreTripReminders(): Promise<{ sent: number }> {
  const tomorrow = easternTomorrow();

  const candidates = await db.select()
    .from(schema.bookings)
    .where(and(
      isNull(schema.bookings.preTripReminderAt),
      ne(schema.bookings.status, 'cancelled'),
    ));

  // A booking qualifies if its charter date is tomorrow.
  const due = candidates.filter(b => {
    if (!b.customerEmail) return false;
    return b.charterDate === tomorrow;
  });

  let sent = 0;
  const nowIso = new Date().toISOString();
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  for (const b of due) {
    const [boat] = await db.select({ name: schema.boats.name })
      .from(schema.boats)
      .where(eq(schema.boats.id, b.boatId));

    // Gather readiness status
    const signedWaivers = await db.select().from(schema.waivers)
      .where(eq(schema.waivers.bookingRef, b.bookingRef));
    const [insp] = await db.select().from(schema.inspections)
      .where(eq(schema.inspections.bookingRef, b.bookingRef));

    // Check user profile for ID fallback
    let idUploaded = !!b.idUploadedAt;
    if (!idUploaded && b.userId) {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, b.userId));
      if (user?.idUploadedAt) idUploaded = true;
    }

    const depositPaid = ['paid', 'partially_refunded', 'refunded'].includes(b.depositStatus);

    // Generate a fresh deposit link if deposit isn't paid yet and Stripe is configured.
    let depositLink: string | null = null;
    if (!depositPaid && stripe) {
      try {
        const depositAmount = b.depositAmount ?? 1000;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: b.customerEmail,
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Refundable Security Deposit',
                description: `${boat?.name ?? 'Vessel'} · ${b.charterDate} · Trip ${b.bookingRef}`,
              },
              unit_amount: depositAmount * 100,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${appUrl}/booking/success/${b.bookingRef}?deposit=1`,
          cancel_url: `${appUrl}/`,
          metadata: { type: 'deposit', bookingRef: b.bookingRef, bookingId: String(b.id) },
        });
        depositLink = session.url;
        await db.update(schema.bookings).set({
          depositStatus: b.depositStatus === 'none' ? 'requested' : b.depositStatus,
          depositStripeSessionId: session.id,
        }).where(eq(schema.bookings.id, b.id));
      } catch (err) {
        console.error(`Pre-trip reminder: deposit link creation failed for ${b.bookingRef}:`, err);
      }
    }

    try {
      await sendPreTripReminder({
        bookingRef: b.bookingRef,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        boatName: boat?.name ?? 'your boat',
        charterDate: b.charterDate,
        endDate: b.endDate,
        duration: b.duration,
        guestCount: b.guestCount,
        depositAmount: b.depositAmount ?? 1000,
        agreementSigned: b.agreedToTerms,
        idUploaded,
        waiversSigned: signedWaivers.length,
        waiversRequired: b.guestCount,
        depositPaid,
        inspectionSigned: !!insp?.acknowledged,
        renterLink: `${appUrl}/waiver/${b.bookingRef}?renter=1`,
        crewLink: `${appUrl}/waiver/${b.bookingRef}`,
        depositLink,
      });

      // Stamp so we never double-send.
      await db.update(schema.bookings)
        .set({ preTripReminderAt: nowIso })
        .where(eq(schema.bookings.id, b.id));
      sent++;
    } catch (err) {
      console.error(`Pre-trip reminder failed for booking ${b.bookingRef}:`, err);
    }
  }

  if (sent) console.log(`Pre-trip reminders: sent ${sent} (trips on ${tomorrow})`);
  return { sent };
}
