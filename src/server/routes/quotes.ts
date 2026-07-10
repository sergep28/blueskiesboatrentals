import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../../db/index.js';
import { quotes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BS-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const quotesRouter = router({
  create: publicProcedure
    .input(z.object({
      boatId: z.number(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      charterDate: z.string(),
      endDate: z.string().optional(),
      duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']),
      price: z.number(),
      notes: z.string().optional(),
      pickupTime: z.string().optional(),
      dropoffTime: z.string().optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const code = generateCode();
      await db.insert(quotes).values({
        code,
        boatId: input.boatId,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        charterDate: input.charterDate,
        endDate: input.endDate ?? null,
        duration: input.duration,
        price: input.price,
        notes: input.notes ?? null,
        pickupTime: input.pickupTime ?? null,
        dropoffTime: input.dropoffTime ?? null,
        platform: input.platform ?? null,
      });
      return { code };
    }),

  getByCode: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const [quote] = await db.select().from(quotes).where(eq(quotes.code, input)).limit(1);
      return quote ?? null;
    }),

  list: publicProcedure
    .query(async () => {
      return db.select().from(quotes);
    }),

  markBooked: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      await db.update(quotes).set({ status: 'booked' }).where(eq(quotes.code, input));
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      boatId: z.number().optional(),
      customerName: z.string().nullable().optional(),
      customerPhone: z.string().nullable().optional(),
      customerEmail: z.string().nullable().optional(),
      charterDate: z.string().optional(),
      endDate: z.string().nullable().optional(),
      duration: z.enum(['half_day_am', 'half_day_pm', 'full_day', 'multi_day', 'custom']).optional(),
      price: z.number().optional(),
      notes: z.string().nullable().optional(),
      pickupTime: z.string().nullable().optional(),
      dropoffTime: z.string().nullable().optional(),
      platform: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...patch } = input;
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleaned[k] = v;
      await db.update(quotes).set(cleaned).where(eq(quotes.id, id));
      return { ok: true };
    }),

  delete: publicProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      await db.delete(quotes).where(eq(quotes.id, input));
      return { ok: true };
    }),
});
