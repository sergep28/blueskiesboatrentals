// One-off: create the boat_blackouts table on prod.
// Run from Render Shell: `npx tsx scripts/create-blackouts-table.ts`
import pg from 'pg';

const { Client } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }

const client = new Client({ connectionString: url, ssl: false });
await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS boat_blackouts (
      id SERIAL PRIMARY KEY,
      boat_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ boat_blackouts table is ready');
} catch (e) {
  console.error('Failed:', e);
  process.exit(1);
} finally {
  await client.end();
}
