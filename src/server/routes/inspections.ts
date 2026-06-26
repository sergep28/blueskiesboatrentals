import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const INSPECTION_VERSION = '2026-06-26';

const checklistItem = z.object({
  area: z.string(),
  condition: z.enum(['good', 'damage']),
  notes: z.string().optional(),
});

export const inspectionsRouter = router({
  // Submit a signed conditional inspection (renter-facing).
  submit: publicProcedure.input(z.object({
    bookingRef: z.string(),
    operatorName: z.string().optional(),
    checklist: z.array(checklistItem),
    damageNotes: z.string().optional(),
    hullDiagram: z.string().optional(),
    outboardDiagram: z.string().optional(),
    acknowledged: z.boolean().default(false),
    signaturePrinted: z.string().min(1),
    signatureData: z.string().optional(),
    photos: z.array(z.object({
      area: z.string().optional(),
      imageData: z.string(),
    })).default([]),
  })).mutation(async ({ input }) => {
    const code = input.bookingRef.trim().toUpperCase();
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.bookingRef, code));
    if (!booking) throw new Error('Trip not found. Please double-check the trip code.');

    await db.insert(schema.inspections).values({
      bookingRef: code,
      operatorName: input.operatorName?.trim() || undefined,
      checklist: JSON.stringify(input.checklist),
      damageNotes: input.damageNotes?.trim() || undefined,
      hullDiagram: input.hullDiagram || undefined,
      outboardDiagram: input.outboardDiagram || undefined,
      acknowledged: input.acknowledged,
      signaturePrinted: input.signaturePrinted.trim(),
      signatureData: input.signatureData,
    });

    if (input.photos.length) {
      await db.insert(schema.inspectionPhotos).values(
        input.photos.map(p => ({
          bookingRef: code,
          area: p.area?.trim() || 'general',
          imageData: p.imageData,
        }))
      );
    }

    return { ok: true };
  }),

  // Whether a trip already has a submitted inspection (renter page guard).
  statusByBooking: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const rows = await db.select().from(schema.inspections).where(eq(schema.inspections.bookingRef, code));
    return { signed: rows.length > 0, signedAt: rows[0]?.signedAt ?? null };
  }),

  // --- Admin (gated client-side, consistent with other routers) ---
  adminList: publicProcedure.query(async () => {
    return db.select().from(schema.inspections).orderBy(desc(schema.inspections.signedAt));
  }),

  // Full inspection + photos for one trip.
  adminByBooking: publicProcedure.input(z.string()).query(async ({ input }) => {
    const code = input.trim().toUpperCase();
    const [inspection] = await db.select().from(schema.inspections)
      .where(eq(schema.inspections.bookingRef, code))
      .orderBy(desc(schema.inspections.signedAt));
    const photos = await db.select().from(schema.inspectionPhotos)
      .where(eq(schema.inspectionPhotos.bookingRef, code))
      .orderBy(desc(schema.inspectionPhotos.createdAt));
    return { inspection: inspection ?? null, photos };
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    const [row] = await db.select().from(schema.inspections).where(eq(schema.inspections.id, input));
    if (row) {
      await db.delete(schema.inspectionPhotos).where(eq(schema.inspectionPhotos.bookingRef, row.bookingRef));
    }
    return db.delete(schema.inspections).where(eq(schema.inspections.id, input));
  }),
});
