import { sql } from 'drizzle-orm';
import { db, schema } from './index.js';
import { PROPERTY_SEED_ROWS } from './properties-seed-data.js';

// Idempotent: creates the `properties` table if missing and seeds it once
// (only when empty). Runs on server startup so a normal deploy provisions it,
// without relying on `drizzle-kit push` (which fails on this DB due to schema
// drift on pre-existing tables).
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS properties (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  host text,
  location text NOT NULL,
  type text NOT NULL,
  guests integer DEFAULT 2 NOT NULL,
  bedrooms integer DEFAULT 1 NOT NULL,
  bathrooms real,
  rating real,
  reviews integer DEFAULT 0 NOT NULL,
  description text,
  highlights text,
  price_per_night real DEFAULT 0 NOT NULL,
  cleaning_fee real DEFAULT 150 NOT NULL,
  image_url text,
  gallery_images text,
  status text DEFAULT 'active' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

export async function ensureProperties() {
  await db.execute(sql.raw(CREATE_TABLE_SQL));
  // Insert any seed rows that aren't present yet (matched by unique slug).
  // ON CONFLICT DO NOTHING means existing rows — including admin price edits —
  // are never overwritten; only brand-new listings get added.
  const before = await db.select().from(schema.properties);
  await db.insert(schema.properties).values(PROPERTY_SEED_ROWS).onConflictDoNothing({ target: schema.properties.slug });
  const after = await db.select().from(schema.properties);
  const added = after.length - before.length;
  console.log(`ensureProperties: table ready (${after.length} rows, ${added} added this boot)`);
}
