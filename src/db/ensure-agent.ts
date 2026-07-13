import { sql } from 'drizzle-orm';
import { db } from './index.js';

export async function ensureAgent() {
  // Social posts table
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      theme TEXT NOT NULL,
      content TEXT NOT NULL,
      hashtags TEXT,
      image_suggestion TEXT,
      photo_file_id TEXT,
      photo_name TEXT,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_for TEXT,
      posted_at TEXT,
      rejected_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  // Agent chat messages
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS agent_chats (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  console.log('  [agent] tables ready');
}
