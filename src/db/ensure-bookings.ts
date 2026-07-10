import { sql } from 'drizzle-orm';
import { db } from './index.js';

// Idempotent additive migration for the bookings table on startup.
// (The Render build does not run migrations, and drizzle-kit push fails on
// this DB due to schema drift.)
export async function ensureBookings() {
  try {
    await db.execute(sql.raw('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_requested_at text'));
  } catch (e: any) {
    if (!e.message?.includes('already exists')) console.error('ensureBookings: add review_requested_at failed:', e.message);
  }

  // Unified-booking-flow + security-deposit columns. Additive & idempotent so
  // this is safe to run on every boot. Defaults chosen so pre-existing rows read
  // sensibly: source 'direct', no deposit collected yet.
  const additive: [string, string][] = [
    ['source', "text NOT NULL DEFAULT 'direct'"],
    ['deposit_status', "text NOT NULL DEFAULT 'none'"],
    ['deposit_amount', 'real NOT NULL DEFAULT 1000'],
    ['deposit_stripe_session_id', 'text'],
    ['deposit_payment_intent_id', 'text'],
    ['deposit_stripe_event_id', 'text'],
    ['deposit_paid_at', 'text'],
    ['deposit_refunded_amount', 'real NOT NULL DEFAULT 0'],
  ];
  for (const [col, type] of additive) {
    try {
      await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${col} ${type}`));
    } catch (e: any) {
      if (!e.message?.includes('already exists')) console.error(`ensureBookings: add ${col} failed:`, e.message);
    }
  }
  // Unique index backing the deposit webhook idempotency check (matches the
  // .unique() on stripeEventId's deposit counterpart in the schema).
  try {
    await db.execute(sql.raw('CREATE UNIQUE INDEX IF NOT EXISTS bookings_deposit_stripe_event_id_key ON bookings (deposit_stripe_event_id)'));
  } catch (e: any) {
    console.error('ensureBookings: deposit event unique index failed:', e.message);
  }

  // One-time safety backfill: mark every ALREADY-ENDED trip as "review requested"
  // so turning on the post-trip review emailer does NOT blast the entire back
  // catalog. Only trips ending today or later stay eligible. Rows already stamped
  // are untouched, so this is safe to run on every boot.
  try {
    await db.execute(sql.raw(`
      UPDATE bookings
      SET review_requested_at = 'backfill'
      WHERE review_requested_at IS NULL
        AND COALESCE(end_date, charter_date) < to_char((now() AT TIME ZONE 'America/New_York'), 'YYYY-MM-DD')
    `));
  } catch (e: any) {
    console.error('ensureBookings: backfill failed:', e.message);
  }

  console.log('ensureBookings: review_requested_at ready');
}
