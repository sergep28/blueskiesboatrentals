import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const FUEL_LEVELS = ['full', '3/4', '1/2', '1/4', 'empty'] as const;
export const MIN_BOAT_PHOTOS = 4;

const meterHours = z.number().finite().nonnegative().max(9999999.99)
  .refine(n => Number(n.toFixed(2)) === n, 'Enter at most two decimal places');

// Hours run on this trip, or null when either reading is missing.
export function hoursUsed(start: string | number | null | undefined, end: string | number | null | undefined) {
  if (start == null || end == null) return null;
  return Math.round((Number(end) - Number(start)) * 100) / 100;
}

async function startReading(code: string) {
  const [insp] = await db.select().from(schema.inspections)
    .where(eq(schema.inspections.bookingRef, code))
    .orderBy(desc(schema.inspections.signedAt));
  return insp?.startMeterHours ?? null;
}

export const returnsRouter = router({
  // Renter-facing: signed return check-in when the boat comes back.
  submit: publicProcedure.input(z.object({
    bookingRef: z.string(),
    endMeterHours: meterHours,
    fuelLevel: z.enum(FUEL_LEVELS),
    newDamage: z.boolean(),
    notes: z.string().optional(),
    acknowledged: z.literal(true),
    signaturePrinted: z.string().trim().min(1),
    signatureData: z.string().min(1),
    photos: z.array(z.object({
      kind: z.enum(['meter', 'fuel', 'boat', 'damage']),
      imageData: z.string().min(1),
    })),
  })).mutation(async ({ input }) => {
    const code = input.bookingRef.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) throw new Error('Trip not found. Please double-check the trip code.');

    const count = (k: string) => input.photos.filter(p => p.kind === k).length;
    if (count('meter') < 1) throw new Error('Please add a photo of the hour meter.');
    if (count('boat') < MIN_BOAT_PHOTOS) throw new Error(`Please add at least ${MIN_BOAT_PHOTOS} photos of the boat.`);
    if (input.newDamage && !input.notes?.trim()) throw new Error('Please describe the new damage.');

    const start = await startReading(code);
    if (start != null && input.endMeterHours < Number(start)) {
      throw new Error(`The ending meter reading can't be lower than the starting reading (${start} hours). Please double-check the meter.`);
    }

    const existing = await db.select().from(schema.tripReturns).where(eq(schema.tripReturns.bookingRef, code));
    if (existing.length) throw new Error('A return check-in was already submitted for this trip.');

    await db.insert(schema.tripReturns).values({
      bookingRef: code,
      endMeterHours: input.endMeterHours.toFixed(2),
      fuelLevel: input.fuelLevel,
      newDamage: input.newDamage,
      notes: input.notes?.trim() || undefined,
      acknowledged: true,
      signaturePrinted: input.signaturePrinted.trim(),
      signatureData: input.signatureData,
    });
    await db.insert(schema.returnPhotos).values(
      input.photos.map(p => ({ bookingRef: code, kind: p.kind, imageData: p.imageData }))
    );

    return { ok: true, hoursUsed: hoursUsed(start, input.endMeterHours) };
  }),

  // Renter page guard + the starting reading to show them.
  statusByBooking: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const rows = await db.select().from(schema.tripReturns).where(eq(schema.tripReturns.bookingRef, code));
    return { submitted: rows.length > 0, startMeterHours: await startReading(code) };
  }),

  adminList: adminProcedure.query(async () => {
    return db.select({ bookingRef: schema.tripReturns.bookingRef }).from(schema.tripReturns);
  }),

  adminByBooking: adminProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const [ret] = await db.select().from(schema.tripReturns)
      .where(eq(schema.tripReturns.bookingRef, code))
      .orderBy(desc(schema.tripReturns.returnedAt));
    const photos = ret ? await db.select().from(schema.returnPhotos)
      .where(eq(schema.returnPhotos.bookingRef, code))
      .orderBy(desc(schema.returnPhotos.createdAt)) : [];
    const start = await startReading(code);
    return { ret: ret ?? null, photos, startMeterHours: start, hoursUsed: hoursUsed(start, ret?.endMeterHours) };
  }),

  // Lets you clear a bad submission so the renter can redo it.
  delete: adminProcedure.input(z.number()).mutation(async ({ input }) => {
    const [row] = await db.select().from(schema.tripReturns).where(eq(schema.tripReturns.id, input));
    if (row) await db.delete(schema.returnPhotos).where(eq(schema.returnPhotos.bookingRef, row.bookingRef));
    return db.delete(schema.tripReturns).where(eq(schema.tripReturns.id, input));
  }),
});
