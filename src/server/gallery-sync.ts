import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

/**
 * When a blog post is published, extract its cover image and inline photos
 * and add them to the gallery table (skipping duplicates).
 */
export async function addBlogPhotosToGallery(postId: number) {
  const [post] = await db.select({
    coverImage: schema.posts.coverImage,
    content: schema.posts.content,
    category: schema.posts.category,
    title: schema.posts.title,
  }).from(schema.posts).where(eq(schema.posts.id, postId)).limit(1);

  if (!post) return;

  const galleryCategory = (['fishing', 'fishing_report'].includes(post.category || '') ? 'fishing'
    : post.category === 'experiences' ? 'lifestyle'
    : 'destinations') as 'fishing' | 'sunset' | 'snorkeling' | 'destinations' | 'lifestyle' | 'boats';

  const photoUrls: string[] = [];
  if (post.coverImage) photoUrls.push(post.coverImage);
  const imgRegex = /src="(\/api\/drive-photo\/[^"]+)"/g;
  let match;
  while ((match = imgRegex.exec(post.content || '')) !== null) {
    photoUrls.push(match[1]);
  }

  for (const url of photoUrls) {
    const existing = await db.select({ id: schema.gallery.id })
      .from(schema.gallery).where(eq(schema.gallery.imageUrl, url)).limit(1);
    if (existing.length === 0) {
      await db.insert(schema.gallery).values({
        imageUrl: url,
        caption: post.title || '',
        category: galleryCategory,
      });
    }
  }
}
