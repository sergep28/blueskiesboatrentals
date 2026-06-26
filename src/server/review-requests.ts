import { and, eq, ne, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { sendReviewRequest } from './email.js';

// Today's date (YYYY-MM-DD) in Eastern time — trips are stored as local date strings.
function easternToday(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return eastern.toISOString().split('T')[0];
}

// Send a one-time Google review request for every trip that has ended and hasn't
// been emailed yet. Idempotent: each booking is stamped (review_requested_at) once
// sent, so this is safe to run on a schedule and on the manual cron endpoint.
// Existing past trips were back-stamped in ensureBookings, so this never blasts the
// back catalog — only trips ending after go-live qualify.
export async function sendPendingReviewRequests(): Promise<{ sent: number }> {
  const today = easternToday();
  // Defense-in-depth: never email trips that ended more than a few days ago, even
  // if the one-time backfill in ensureBookings ever failed to stamp them.
  const floor = new Date(`${today}T00:00:00Z`);
  floor.setUTCDate(floor.getUTCDate() - 4);
  const earliest = floor.toISOString().split('T')[0];

  const candidates = await db.select()
    .from(schema.bookings)
    .where(and(
      isNull(schema.bookings.reviewRequestedAt),
      ne(schema.bookings.status, 'cancelled'),
    ));

  // A trip is due once its effective end date (end date for multi-day, else the
  // charter date) is strictly before today — and within the recent window.
  const due = candidates.filter(b => {
    if (!b.customerEmail) return false;
    const effectiveEnd = b.endDate ?? b.charterDate;
    return effectiveEnd < today && effectiveEnd >= earliest;
  });

  let sent = 0;
  const nowIso = new Date().toISOString();
  for (const b of due) {
    const [boat] = await db.select({ name: schema.boats.name })
      .from(schema.boats)
      .where(eq(schema.boats.id, b.boatId));
    try {
      await sendReviewRequest({
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        boatName: boat?.name ?? 'your boat',
        charterDate: b.charterDate,
      });
      // Stamp regardless of Resend being configured, so we never double-send.
      await db.update(schema.bookings)
        .set({ reviewRequestedAt: nowIso })
        .where(eq(schema.bookings.id, b.id));
      sent++;
    } catch (err) {
      console.error(`Review request failed for booking ${b.bookingRef}:`, err);
    }
  }

  if (sent) console.log(`Review requests: sent ${sent} (as of ${today})`);
  return { sent };
}
