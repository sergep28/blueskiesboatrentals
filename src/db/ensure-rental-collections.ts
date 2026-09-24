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
CREATE TABLE IF NOT EXISTS legacy_deposit_checkouts (
  booking_id integer PRIMARY KEY REFERENCES bookings(id),
  generation integer NOT NULL DEFAULT 0 CHECK (generation >= 0),
  session_id text UNIQUE,
  payload text NOT NULL
);
CREATE TABLE IF NOT EXISTS rental_payments (
  session_id text PRIMARY KEY,
  intent_id text UNIQUE NOT NULL,
  booking_id integer NOT NULL REFERENCES bookings(id),
  type text NOT NULL CHECK (type IN ('deposit', 'rental_balance')),
  CONSTRAINT rental_payments_booking_type_key UNIQUE (booking_id, type)
);
CREATE TABLE IF NOT EXISTS enrolled_deposit_refunds (
  booking_id integer PRIMARY KEY REFERENCES bookings(id),
  intent_id text NOT NULL,
  paid_cents integer NOT NULL CHECK (paid_cents > 0),
  refund_cents integer NOT NULL CHECK (refund_cents >= 0 AND refund_cents <= paid_cents),
  deduction_cents integer NOT NULL CHECK (deduction_cents >= 0 AND deduction_cents + refund_cents = paid_cents),
  note text,
  provider_key text UNIQUE NOT NULL,
  refund_id text UNIQUE,
  state text NOT NULL CHECK (state IN ('claimed', 'pending', 'settled')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;
export async function ensureRentalCollections(pool: Pick<Pool, 'query'>) {
  await pool.query(rentalCollectionMigration);
}
