import { db, schema, pool } from './index.js';
import { PROPERTY_SEED_ROWS } from './properties-seed-data.js';

// Independent, idempotent seed for the `properties` table.
// Separate from seed.ts because that script short-circuits when boats already
// exist (which is always true on the live DB), so it would never seed properties.
async function main() {
  const existing = await db.select().from(schema.properties);
  if (existing.length > 0) {
    console.log(`Property seed skipped — ${existing.length} properties already present.`);
    await pool.end();
    return;
  }

  console.log('Seeding properties...');
  await db.insert(schema.properties).values(PROPERTY_SEED_ROWS);
  console.log('Properties seeded successfully!');
  await pool.end();
}

main().catch((err) => {
  console.error('Property seed failed:', err);
  process.exit(1);
});
