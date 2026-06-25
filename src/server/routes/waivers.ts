import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const WAIVER_VERSION = '2026-06-23';

// Public-safe roster shape (no signature image / email) for the by-trip count + list.
function toRoster(w: typeof schema.waivers.$inferSelect) {
  return {
    id: w.id,
    participantName: w.participantName,
    isMinor: w.isMinor,
    guardianName: w.guardianName,
    inWaterActivity: w.inWaterActivity,
    isRenter: w.isRenter,
    signedAt: w.signedAt,
  };
}

export const waiversRouter = router({
  // Validate a trip code and return safe trip details for the public waiver page.
  tripInfo: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) return null;
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, booking.boatId));
    const signed = await db.select().from(schema.waivers).where(eq(schema.waivers.bookingRef, code));
    return {
      bookingRef: booking.bookingRef,
      renterName: booking.customerName,
      renterEmail: booking.customerEmail,
      boatName: boat?.name ?? 'your vessel',
      charterDate: booking.charterDate,
      guestCount: booking.guestCount,
      signedCount: signed.length,
    };
  }),

  // Public roster for a trip (names + status, no signatures).
  byBooking: publicProcedure.input(z.string()).query(async ({ input }) => {
    const rows = await db.select().from(schema.waivers)
      .where(eq(schema.waivers.bookingRef, input.trim().toUpperCase()))
      .orderBy(desc(schema.waivers.signedAt));
    return rows.map(toRoster);
  }),

  // Submit a signed waiver.
  create: publicProcedure.input(z.object({
    bookingRef: z.string(),
    participantName: z.string().min(1),
    participantEmail: z.string().email().optional().or(z.literal('')),
    isMinor: z.boolean().default(false),
    guardianName: z.string().optional(),
    signaturePrinted: z.string().min(1),
    signatureData: z.string().optional(),
    inWaterActivity: z.boolean().default(false),
    isRenter: z.boolean().default(false),
  })).mutation(async ({ input, ctx }) => {
    const code = input.bookingRef.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) throw new Error('Trip not found. Please double-check the trip code.');
    if (input.isMinor && !input.guardianName?.trim()) {
      throw new Error('A parent or guardian name is required for a minor.');
    }
    await db.insert(schema.waivers).values({
      bookingRef: code,
      participantName: input.participantName.trim(),
      participantEmail: input.participantEmail || undefined,
      isMinor: input.isMinor,
      guardianName: input.guardianName?.trim() || undefined,
      signaturePrinted: input.signaturePrinted.trim(),
      signatureData: input.signatureData,
      inWaterActivity: input.inWaterActivity,
      isRenter: input.isRenter,
      waiverVersion: WAIVER_VERSION,
      ipAddress: (ctx as any)?.ip,
    });
    const signed = await db.select().from(schema.waivers).where(eq(schema.waivers.bookingRef, code));
    return { ok: true, signedCount: signed.length, guestCount: booking.guestCount };
  }),

  // --- Admin (gated client-side, consistent with other routers) ---
  adminList: publicProcedure.query(async () => {
    return db.select().from(schema.waivers).orderBy(desc(schema.waivers.signedAt));
  }),

  adminByBooking: publicProcedure.input(z.string()).query(async ({ input }) => {
    return db.select().from(schema.waivers)
      .where(eq(schema.waivers.bookingRef, input.trim().toUpperCase()))
      .orderBy(desc(schema.waivers.signedAt));
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    return db.delete(schema.waivers).where(eq(schema.waivers.id, input));
  }),
});
