import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Copy/wiring checks only, not browser interaction coverage.
const page = readFileSync(new URL('../src/client/pages/admin/AdminBookings.tsx', import.meta.url), 'utf8');
test('manual entry explains that creating a reservation does not record payment', () => {
  const creation = readFileSync(new URL('../src/client/pages/admin/NewBookingCreate.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('{newBooking.controls}'));
  assert.ok(creation.includes('Creating a booking does not collect or record payment. Payment starts as pending.'));
});
test('CSV importer explains its conservative payment default', () => {
  assert.ok(page.includes('CSV imports start with payment pending. Booking status and trip dates are not proof of payment or refund.'));
});
