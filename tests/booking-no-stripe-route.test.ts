import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
let writes = 0;
let reads = 0;
const db = {
  select: () => { reads++; throw new Error('Unexpected DB read without online payment'); },
  insert: () => { writes++; throw new Error('Unexpected DB insert without online payment'); },
  update: () => { writes++; throw new Error('Unexpected DB update without online payment'); },
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('stripe', { defaultExport: class UnexpectedStripe { constructor() { throw new Error('Unexpected Stripe instance'); } } });
mock.module('../src/server/email.ts', { namedExports: {
  sendBookingConfirmation: () => { throw new Error('Unexpected email'); },
  sendWaiverPacket: () => { throw new Error('Unexpected email'); },
  sendDepositSettlement: () => { throw new Error('Unexpected email'); },
} });
mock.module('../src/server/deposits.ts', { namedExports: {
  createDepositLink: () => { throw new Error('Unexpected deposit'); }, depositPayUrl: () => 'https://example.invalid',
} });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const input = { boatId: 1, customerName: 'Synthetic renter', customerEmail: 'test@example.invalid',
  charterDate: '2099-01-01', duration: 'full_day' as const, charterType: 'cruising' as const, guestCount: 2 };

test('unconfigured Stripe refuses public checkout before any booking or benefit is written', async () => {
  await assert.rejects(bookingsRouter.createCaller({ isAdmin: false }).create(input), /online payment|unavailable/i);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test('admin checkout request without Stripe does not silently become paid', async () => {
  await assert.rejects(bookingsRouter.createCaller({ isAdmin: true }).create(input), /online payment|unavailable/i);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});
