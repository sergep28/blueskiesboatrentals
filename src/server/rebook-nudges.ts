import { and, eq, ne, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { sendRebookNudge } from './email.js';

// Date 7 days ago (YYYY-MM-DD) in Eastern time.
function easternDaysAgo(days: number): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  eastern.setDate(eastern.getDate() - days);
  return eastern.toISOString().split('T')[0];
}

// Send rebook/loyalty nudge for bookings that ended ~7 days ago. Idempotent:
// each booking is stamped (rebook_nudge_at) once sent.
export async function sendPendingRebookNudges(): Promise<{ sent: number }> {
  // Target trips that ended 7 days ago (give or take a day for scan frequency)
  const targetDate = easternDaysAgo(7);
  const earliest = easternDaysAgo(9); // window so we don't miss any

  const candidates = await db.select()
    .from(schema.bookings)
    .where(and(
      isNull(schema.bookings.rebookNudgeAt),
      ne(schema.bookings.status, 'cancelled'),
    ));

  const due = candidates.filter(b => {
    if (!b.customerEmail) return false;
    const effectiveEnd = b.endDate ?? b.charterDate;
    return effectiveEnd <= targetDate && effectiveEnd >= earliest;
  });

  let sent = 0;
  const nowIso = new Date().toISOString();

  for (const b of due) {
    const [boat] = await db.select({ name: schema.boats.name })
      .from(schema.boats)
      .where(eq(schema.boats.id, b.boatId));

    // Get user's total loyalty points
    let totalPoints = b.loyaltyPointsEarned ?? 0;
    if (b.userId) {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, b.userId));
      if (user) totalPoints = user.loyaltyPoints;
    }

    try {
      await sendRebookNudge({
        bookingRef: b.bookingRef,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        boatName: boat?.name ?? 'your boat',
        loyaltyPointsEarned: b.loyaltyPointsEarned ?? 0,
        totalLoyaltyPoints: totalPoints,
      });

      await db.update(schema.bookings)
        .set({ rebookNudgeAt: nowIso })
        .where(eq(schema.bookings.id, b.id));
      sent++;
    } catch (err) {
      console.error(`Rebook nudge failed for booking ${b.bookingRef}:`, err);
    }
  }

  if (sent) console.log(`Rebook nudges: sent ${sent}`);
  return { sent };
}
