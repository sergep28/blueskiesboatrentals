import { sql } from 'drizzle-orm';
import { db } from './index.js';

// Idempotent: creates the `waivers` table if missing, on server startup.
// Same pattern as ensure-properties (the Render build does not run migrations,
// and drizzle-kit push fails on this DB due to schema drift). Additive only.
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS waivers (
  id serial PRIMARY KEY,
  booking_ref text NOT NULL,
  participant_name text NOT NULL,
  participant_email text,
  is_minor boolean DEFAULT false NOT NULL,
  guardian_name text,
  signature_printed text,
  signature_data text,
  in_water_activity boolean DEFAULT false NOT NULL,
  is_renter boolean DEFAULT false NOT NULL,
  waiver_version text,
  ip_address text,
  signed_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

export async function ensureWaivers() {
  await db.execute(sql.raw(CREATE_TABLE_SQL));
  // Helpful index for the by-trip lookups (idempotent).
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS waivers_booking_ref_idx ON waivers (booking_ref)'));
  console.log('ensureWaivers: table ready');
}
