import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';

export const blogRouter = router({
  list: publicProcedure.input(z.object({
    category: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    if (input?.category && input.category !== 'all') {
      return db.all(sql`SELECT * FROM posts WHERE status = 'published' AND category = ${input.category} ORDER BY created_at DESC`);
    }
    return db.all(sql`SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC`);
  }),

  getBySlug: publicProcedure.input(z.string()).query(async ({ input }) => {
    const results = db.all(sql`SELECT * FROM posts WHERE slug = ${input} LIMIT 1`);
    return results[0] ?? null;
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
    return db.run(sql`INSERT INTO posts (title, slug, excerpt, content, cover_image, category, tags, author, status, instagram_url, tiktok_url, facebook_url, youtube_url)
      VALUES (${input.title}, ${input.slug}, ${input.excerpt}, ${input.content}, ${input.coverImage}, ${input.category}, ${input.tags}, ${input.author}, 'published', ${input.instagramUrl}, ${input.tiktokUrl}, ${input.facebookUrl}, ${input.youtubeUrl})`);
  }),
});
