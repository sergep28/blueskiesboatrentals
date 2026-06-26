import { sql } from 'drizzle-orm';
import { db } from './index.js';

// Idempotent: creates the conditional-inspection tables on server startup.
// Same pattern as ensure-waivers (the Render build does not run migrations,
// and drizzle-kit push fails on this DB due to schema drift). Additive only.
const CREATE_INSPECTIONS = `
CREATE TABLE IF NOT EXISTS inspections (
  id serial PRIMARY KEY,
  booking_ref text NOT NULL,
  operator_name text,
  checklist text,
  damage_notes text,
  hull_diagram text,
  outboard_diagram text,
  acknowledged boolean DEFAULT false NOT NULL,
  signature_printed text,
  signature_data text,
  signed_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

const CREATE_PHOTOS = `
CREATE TABLE IF NOT EXISTS inspection_photos (
  id serial PRIMARY KEY,
  booking_ref text NOT NULL,
  area text,
  image_data text NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

export async function ensureInspections() {
  await db.execute(sql.raw(CREATE_INSPECTIONS));
  await db.execute(sql.raw(CREATE_PHOTOS));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS inspections_booking_ref_idx ON inspections (booking_ref)'));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS inspection_photos_booking_ref_idx ON inspection_photos (booking_ref)'));
  console.log('ensureInspections: tables ready');
}
