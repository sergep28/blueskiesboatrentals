import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
const booking = { bookingRef: 'BSC-SYNTHETIC', charterDate: '2099-01-01', endDate: '2099-01-03', duration: 'custom', stayAddress: null };
const writes: any[] = [];
const db = {
  select: () => ({ from: () => ({ where: async () => [booking] }) }),
  update: () => ({ set: (values: any) => ({ where: async () => { writes.push(values); } }) }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('stripe', { defaultExport: class UnexpectedStripe { constructor() { throw new Error('Unexpected Stripe call'); } } });
mock.module('../src/server/email.ts', { namedExports: { sendWaiverPacket: async () => {}, sendDepositSettlement: async () => {} } });
mock.module('../src/server/deposits.ts', { namedExports: { createDepositLink: async () => {}, depositPayUrl: () => '' } });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const client = bookingsRouter.createCaller({ isAdmin: false });
const input = { bookingRef: 'BSC-SYNTHETIC', signaturePrinted: 'Test Renter' };
beforeEach(() => { writes.length = 0; booking.endDate = '2099-01-03'; booking.duration = 'custom'; });

test('multi-day renter cannot sign agreement without the overnight boat address', async () => {
  await assert.rejects(client.signAgreement(input), /overnight.*address/i);
  await assert.rejects(client.signAgreement({ ...input, stayAddress: '  ' }), /overnight.*address/i);
  assert.equal(writes.length, 0);
});

test('multi-day renter signing saves a trimmed boat address with current agreement version', async () => {
  await client.signAgreement({ ...input, stayAddress: '  123 Marina Way, Slip B-2  ' });
  assert.equal(writes[0]?.stayAddress, '123 Marina Way, Slip B-2');
  assert.equal(writes[0]?.agreementVersion, '2026-09-22');
});

test('single-day renter signing remains valid without an overnight address', async () => {
  booking.endDate = '2099-01-01';
  await client.signAgreement(input);
  assert.equal(writes.length, 1);
});
