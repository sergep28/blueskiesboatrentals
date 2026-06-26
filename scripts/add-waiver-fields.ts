import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  const columns = [
    { name: 'participant_phone', type: 'TEXT' },
    { name: 'date_of_birth', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'emergency_contact_name', type: 'TEXT' },
    { name: 'emergency_contact_phone', type: 'TEXT' },
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE waivers ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`));
      console.log(`✓ Added ${col.name}`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`✓ ${col.name} already exists`);
      } else {
        console.error(`✗ Failed to add ${col.name}:`, e.message);
      }
    }
  }
  console.log('\n✓ Waiver fields migration complete');
  process.exit(0);
}

main();
