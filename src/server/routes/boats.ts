import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';

export const boatsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.boats).all();
  }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const [boat] = await db.select().from(schema.boats).where(eq(schema.boats.id, input));
    return boat ?? null;
  }),

  create: publicProcedure.input(z.object({
    name: z.string(),
    model: z.string(),
    type: z.enum(['center_console', 'dual_console', 'bay_boat', 'catamaran']),
    lengthFt: z.number(),
    capacity: z.number(),
    description: z.string().optional(),
    features: z.string().optional(),
    imageUrl: z.string().optional(),
    galleryImages: z.string().optional(),
    priceHalfDay: z.number(),
    priceFullDay: z.number(),
    priceMultiDay: z.number().optional(),
    homePort: z.string().optional(),
    status: z.enum(['active', 'maintenance', 'retired']).default('active'),
  })).mutation(async ({ input }) => {
    return db.insert(schema.boats).values(input).run();
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    model: z.string().optional(),
    type: z.enum(['center_console', 'dual_console', 'bay_boat', 'catamaran']).optional(),
    lengthFt: z.number().optional(),
    capacity: z.number().optional(),
    description: z.string().optional(),
    features: z.string().optional(),
    imageUrl: z.string().optional(),
    priceHalfDay: z.number().optional(),
    priceFullDay: z.number().optional(),
    priceMultiDay: z.number().optional(),
    homePort: z.string().optional(),
    status: z.enum(['active', 'maintenance', 'retired']).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return db.update(schema.boats).set(data).where(eq(schema.boats.id, id)).run();
  }),
});
