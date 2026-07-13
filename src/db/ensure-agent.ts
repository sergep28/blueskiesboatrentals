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

  // SEO snapshots from Search Console
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS seo_snapshots (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      query TEXT NOT NULL,
      page TEXT,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      position REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  // SEO alerts
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS seo_alerts (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  // Actions the agent has staged for approval. Nothing here has been executed.
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS agent_actions (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      summary TEXT NOT NULL,
      payload TEXT NOT NULL,
      booking_ref TEXT,
      result TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    )
  `));

  console.log('  [agent] tables ready');
}
