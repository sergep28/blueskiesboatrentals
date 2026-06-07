import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Adding rental agreement columns to bookings table...');

  await db.execute(sql`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS signature TEXT,
    ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS agreement_signed_at TEXT,
    ADD COLUMN IF NOT EXISTS agreement_version TEXT
  `);

  console.log('Done! Columns added: signature, agreed_to_terms, agreement_signed_at, agreement_version');
}

migrate().catch(console.error).finally(() => process.exit());
