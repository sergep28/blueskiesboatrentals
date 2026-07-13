import { eq, ne } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { sendReadinessNudge, sendReadinessAlert } from './email.js';
import { depositPayUrl } from './deposits.js';

// Chase customers who haven't finished their pre-boarding steps, at 7, 3 and 1
// days before the charter.
//
// Before this, the ONLY follow-up was the pre-trip reminder the day before the
// trip. An OTA guest who booked three weeks out and ignored the welcome email
// heard nothing for twenty days — and then we were chasing a signature, an ID and
// a $1,000 deposit the night before they showed up at the dock.
//
// Each booking is stamped with the milestone already sent (readiness_nudge_stage),
// so nobody is chased twice for the same one. A booking that's fully ready is
// never emailed at all.

// ASCENDING matters: we pick the milestone with `.find(m => daysOut <= m)`, which
// returns the FIRST match. Ordered [7,3,1], a trip 2 days out would match 7 and be
// treated as a week away. Ordered [1,3,7], it correctly lands on the 3-day mark.
const MILESTONES = [1, 3, 7] as const;

/** Days from today (Eastern) until a date, as a whole number. */
function daysUntil(dateStr: string): number {
  const easternNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const today = new Date(easternNow.getFullYear(), easternNow.getMonth(), easternNow.getDate());
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function sendPendingReadinessNudges(): Promise<{ sent: number }> {
  const bookings = await db.select().from(schema.bookings)
    .where(ne(schema.bookings.status, 'cancelled'));

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const alertList: Array<{
    bookingRef: string; customerName: string; customerPhone: string | null;
    boatName: string; missing: string[];
  }> = [];
  let sent = 0;

  for (const b of bookings) {
    if (!b.customerEmail) continue;

    const daysOut = daysUntil(b.charterDate);
    if (daysOut < 0) continue;   // already happened

    // The milestone this booking is due for: the largest one it has reached.
    const due = MILESTONES.find(m => daysOut <= m);
    if (due === undefined) continue;                         // more than 7 days out

    // Already chased at this milestone (or a later, more urgent one).
    if (b.readinessNudgeStage != null && b.readinessNudgeStage <= due) continue;

    // ---- What's actually outstanding? ----
    const waivers = await db.select().from(schema.waivers)
      .where(eq(schema.waivers.bookingRef, b.bookingRef));

    let idUploaded = !!b.idUploadedAt;
    if (!idUploaded && b.userId) {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, b.userId));
      if (user?.idUploadedAt) idUploaded = true;
    }

    const missing = {
      agreement: !b.agreedToTerms,
      id: !idUploaded,
      waivers: b.guestCount > 0 && waivers.length < b.guestCount,
      deposit: !['paid', 'partially_refunded', 'refunded'].includes(b.depositStatus),
    };

    // Fully ready — never chase them. Stamp it so we stop re-checking.
    if (!missing.agreement && !missing.id && !missing.waivers && !missing.deposit) {
      await db.update(schema.bookings)
        .set({ readinessNudgeStage: due })
        .where(eq(schema.bookings.id, b.id));
      continue;
    }

    const [boat] = await db.select({ name: schema.boats.name })
      .from(schema.boats).where(eq(schema.boats.id, b.boatId));

    try {
      await sendReadinessNudge({
        bookingRef: b.bookingRef,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        boatName: boat?.name ?? 'your boat',
        charterDate: b.charterDate,
        daysOut,
        depositAmount: b.depositAmount ?? 1000,
        missing,
        renterLink: `${appUrl}/waiver/${b.bookingRef}?renter=1`,
        crewLink: `${appUrl}/waiver/${b.bookingRef}`,
        depositLink: missing.deposit ? depositPayUrl(b.bookingRef) : null,
      });

      await db.update(schema.bookings)
        .set({ readinessNudgeStage: due })
        .where(eq(schema.bookings.id, b.id));
      sent++;

      // At the final milestone, flag it for Serge — this is the one where he may
      // need to actually call the customer.
      if (due === 1) {
        const labels: string[] = [];
        if (missing.agreement) labels.push('Rental agreement not signed');
        if (missing.id) labels.push('No photo ID uploaded');
        if (missing.waivers) labels.push(`Waivers: ${waivers.length}/${b.guestCount} signed`);
        if (missing.deposit) labels.push('Security deposit unpaid');
        alertList.push({
          bookingRef: b.bookingRef,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          boatName: boat?.name ?? 'Vessel',
          missing: labels,
        });
      }
    } catch (err) {
      console.error(`Readiness nudge failed for ${b.bookingRef}:`, err);
    }
  }

  if (alertList.length) {
    try {
      await sendReadinessAlert({ bookings: alertList });
    } catch (err) {
      console.error('Readiness alert to admin failed:', err);
    }
  }

  if (sent) console.log(`Readiness nudges: sent ${sent}`);
  return { sent };
}
