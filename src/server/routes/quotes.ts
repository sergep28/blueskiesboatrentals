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
});
