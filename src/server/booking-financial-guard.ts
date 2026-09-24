import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

/** Same booking-row lock/order as rental-store. Callback MUST use tx, not global db.
 * Keep provider refund calls inside this lock until a durable refund adapter exists.
 */
export async function withLegacyBooking<T>(id: number | string, fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>, allowEnrolled = false) {
  return db.transaction(async tx => {
    const result = await tx.execute(sql`SELECT id FROM bookings WHERE ${typeof id === 'number' ? sql`id = ${id}` : sql`booking_ref = ${id}`} FOR UPDATE`);
    const bookingId = result.rows[0]?.id as number | undefined;
    if (!bookingId) throw new Error('Booking not found');
    const [enrolled] = await tx.select().from(schema.rentalCollections).where(eq(schema.rentalCollections.bookingId, bookingId));
    if (enrolled && !allowEnrolled) throw new Error('Enrolled booking: this legacy operation is unsupported; reconcile active sessions first');
    return fn(tx);
  });
}
