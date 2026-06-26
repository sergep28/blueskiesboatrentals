import { sql } from 'drizzle-orm';
import { db } from './index.js';

// Idempotent: adds the custom pickup/dropoff time columns to the `quotes`
// table on server startup. Same pattern as ensure-waivers (the Render build
// does not run migrations, and drizzle-kit push fails on this DB due to
// schema drift). Additive only — existing rows keep NULL.
export async function ensureQuotes() {
  const newCols = [
    'pickup_time TEXT',
    'dropoff_time TEXT',
  ];
  for (const col of newCols) {
    const name = col.split(' ')[0];
    try {
      await db.execute(sql.raw(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS ${col}`));
    } catch (e: any) {
      if (!e.message?.includes('already exists')) console.error(`ensureQuotes: failed to add ${name}:`, e.message);
    }
  }

  console.log('ensureQuotes: columns ready');
}
