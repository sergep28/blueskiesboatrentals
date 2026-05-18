import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const blackoutsRouter = router({
  list: publicProcedure.input(z.number().optional()).query(async ({ input }) => {
    if (input) {
      return db.select().from(schema.boatBlackouts)
        .where(eq(schema.boatBlackouts.boatId, input))
        .orderBy(desc(schema.boatBlackouts.startDate));
    }
    return db.select().from(schema.boatBlackouts).orderBy(desc(schema.boatBlackouts.startDate));
  }),

  create: publicProcedure.input(z.object({
    boatId: z.number(),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().optional(),
  })).mutation(async ({ input }) => {
    const [row] = await db.insert(schema.boatBlackouts).values({
      boatId: input.boatId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
    }).returning({ id: schema.boatBlackouts.id });
    return row;
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    await db.delete(schema.boatBlackouts).where(eq(schema.boatBlackouts.id, input));
    return { ok: true };
  }),
});
