import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db, schema } from '../../db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { addBlogPhotosToGallery } from '../gallery-sync.js';

export const blogRouter = router({
  list: publicProcedure.input(z.object({
    category: z.string().optional(),
    includeDrafts: z.boolean().optional(),
  }).optional()).query(async ({ input }) => {
    const conditions = [];
    if (input?.includeDrafts) {
      // Admin view: show all posts
    } else {
      conditions.push(eq(schema.posts.status, 'published'));
    }
    if (input?.category && input.category !== 'all') {
      conditions.push(eq(schema.posts.category, input.category));
    }
    return db.select().from(schema.posts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.posts.createdAt));
  }),

  getBySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
    const [post] = await db.select().from(schema.posts).where(eq(schema.posts.slug, input)).limit(1);
    return post ?? null;
  }),

  create: adminProcedure.input(z.object({
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
    const tagsJson = input.tags
      ? JSON.stringify(input.tags.split(',').map(t => t.trim()).filter(Boolean))
      : null;
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

  update: adminProcedure.input(z.object({
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
    const tagsJson = input.tags
      ? JSON.stringify(input.tags.split(',').map(t => t.trim()).filter(Boolean))
      : null;
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

  publish: adminProcedure.input(z.number()).mutation(async ({ input }) => {
    await db.update(schema.posts)
      .set({ status: 'published' })
      .where(eq(schema.posts.id, input));
    await addBlogPhotosToGallery(input);
    return { ok: true };
  }),

  delete: adminProcedure.input(z.number()).mutation(async ({ input }) => {
    return db.delete(schema.posts).where(eq(schema.posts.id, input));
  }),
});
