import type { Pool } from 'pg';
// Additive, fail closed at boot. NO INSERT/UPDATE/backfill of existing bookings.
export const rentalCollectionMigration = `
CREATE TABLE IF NOT EXISTS rental_collections (
  booking_id integer PRIMARY KEY REFERENCES bookings(id),
  token text UNIQUE NOT NULL,
  state text NOT NULL,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rental_creation_requests (
  request_key text PRIMARY KEY,
  request_hash text NOT NULL,
  booking_id integer UNIQUE NOT NULL REFERENCES bookings(id),
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rental_checkout_attempts (
  key text PRIMARY KEY,
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS rental_payments (
  session_id text PRIMARY KEY,
  intent_id text UNIQUE NOT NULL,
  booking_id integer NOT NULL REFERENCES bookings(id),
  type text NOT NULL CHECK (type IN ('deposit', 'rental_balance')),
  CONSTRAINT rental_payments_booking_type_key UNIQUE (booking_id, type)
);`;
export async function ensureRentalCollections(pool: Pick<Pool, 'query'>) {
  await pool.query(rentalCollectionMigration);
}
