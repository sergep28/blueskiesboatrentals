import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, asc } from 'drizzle-orm';

const baseFields = {
  name: z.string(),
  slug: z.string(),
  host: z.string().optional(),
  location: z.string(),
  type: z.string(),
  guests: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number().optional(),
  rating: z.number().nullable().optional(),
  reviews: z.number().optional(),
  description: z.string().optional(),
  highlights: z.string().optional(),
  pricePerNight: z.number(),
  cleaningFee: z.number().optional(),
  imageUrl: z.string().optional(),
  galleryImages: z.string().optional(),
  status: z.enum(['active', 'hidden']).default('active'),
  sortOrder: z.number().optional(),
};

export const propertiesRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(schema.properties).orderBy(asc(schema.properties.sortOrder));
  }),

  getBySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [property] = await db.select().from(schema.properties).where(eq(schema.properties.slug, input));
    return property ?? null;
  }),

  create: publicProcedure.input(z.object(baseFields)).mutation(async ({ input }) => {
    return db.insert(schema.properties).values(input);
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    slug: z.string().optional(),
    host: z.string().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    guests: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    rating: z.number().nullable().optional(),
    reviews: z.number().optional(),
    description: z.string().optional(),
    highlights: z.string().optional(),
    pricePerNight: z.number().optional(),
    cleaningFee: z.number().optional(),
    imageUrl: z.string().optional(),
    galleryImages: z.string().optional(),
    status: z.enum(['active', 'hidden']).optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return db.update(schema.properties).set(data).where(eq(schema.properties.id, id));
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    return db.delete(schema.properties).where(eq(schema.properties.id, input));
  }),
});
