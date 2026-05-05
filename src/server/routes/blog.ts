import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc, sql } from 'drizzle-orm';

export const blogRouter = router({
  list: publicProcedure.input(z.object({
    category: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    if (input?.category && input.category !== 'all') {
      return db.select().from(schema.posts)
        .where(sql`${schema.posts.status} = 'published' AND ${schema.posts.category} = ${input.category}`)
        .orderBy(desc(schema.posts.createdAt));
    }
    return db.select().from(schema.posts)
      .where(eq(schema.posts.status, 'published'))
      .orderBy(desc(schema.posts.createdAt));
  }),

  getBySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [post] = await db.select().from(schema.posts).where(eq(schema.posts.slug, input)).limit(1);
    return post ?? null;
  }),

  create: publicProcedure.input(z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    content: z.string(),
    coverImage: z.string().optional(),
    category: z.string().default('general'),
    tags: z.string().optional(),
    author: z.string().default('Serge Parakhnevich'),
    instagramUrl: z.string().optional(),
    tiktokUrl: z.string().optional(),
    facebookUrl: z.string().optional(),
    youtubeUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const tagsJson = input.tags ? JSON.stringify(input.tags.split(',').map(t => t.trim()).filter(Boolean)) : null;
    return db.insert(schema.posts).values({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage,
      category: input.category,
      tags: tagsJson,
      author: input.author,
      status: 'published',
      instagramUrl: input.instagramUrl,
      tiktokUrl: input.tiktokUrl,
      facebookUrl: input.facebookUrl,
      youtubeUrl: input.youtubeUrl,
    });
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    content: z.string(),
    coverImage: z.string().optional(),
    category: z.string().default('general'),
    tags: z.string().optional(),
    author: z.string().default('Serge Parakhnevich'),
    instagramUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const tagsJson = input.tags ? JSON.stringify(input.tags.split(',').map(t => t.trim()).filter(Boolean)) : null;
    return db.update(schema.posts).set({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage,
      category: input.category,
      tags: tagsJson,
      author: input.author,
      instagramUrl: input.instagramUrl,
    }).where(eq(schema.posts.id, input.id));
  }),

  delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
    return db.delete(schema.posts).where(eq(schema.posts.id, input));
  }),
});
