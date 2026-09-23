import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
const booking = { bookingRef: 'BSC-SYNTHETIC', customerName: 'Test Renter', customerEmail: 'test@example.invalid', boatId: 1,
  charterDate: '2099-01-01', endDate: '2099-01-03', duration: 'custom', stayAddress: '123 Private Marina Drive', guestCount: 2,
  agreedToTerms: false, idUploadedAt: null, userId: null, specialRequests: null };
const db = { select: () => ({ from: (table: unknown) => ({ where: async () => table === schema.bookings ? [booking] : table === schema.boats ? [{ name: 'Test Boat' }] : [] }) }) };
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
const { waiversRouter } = await import('../src/server/routes/waivers.ts');
const client = waiversRouter.createCaller({ isAdmin: false });

test('renter agreement trip info identifies multi-day trip but never exposes private overnight address', async () => {
  const trip = await client.tripInfo('BSC-SYNTHETIC');
  assert.equal(trip?.isMultiDay, true);
  assert.equal(Object.hasOwn(trip!, 'stayAddress'), false);
  assert.equal(JSON.stringify(trip).includes(booking.stayAddress), false);
});

test('single-day trip does not require an overnight address', async () => {
  booking.endDate = '2099-01-01';
  booking.duration = 'full_day';
  const trip = await client.tripInfo('BSC-SYNTHETIC');
  assert.equal(trip?.isMultiDay, false);
});
