import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
const writes: { table: unknown; values: any }[] = [];
const boat = { id: 1, status: 'active', name: 'Test boat', priceFullDay: 500, priceHalfDay: 300, priceMultiDay: 450 };
const user = { id: 2, bookingCount: 0, totalSpent: 0, loyaltyPoints: 0 };
const db = {
  select: () => ({ from: (table: unknown) => {
    const rows = table === schema.boats ? [boat] : table === schema.users ? [user] : [];
    return Object.assign(Promise.resolve(rows), { where: () => Promise.resolve(rows) });
  } }),
  insert: (table: unknown) => ({ values: (values: any) => {
    writes.push({ table, values });
    return Object.assign(Promise.resolve(), { returning: () => Promise.resolve([{ id: 3 }]) });
  } }),
  update: (table: unknown) => ({ set: (values: any) => ({ where: async () => { writes.push({ table, values }); } }) }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('stripe', { defaultExport: class UnexpectedStripe { constructor() { throw new Error('Unexpected Stripe call'); } } });
mock.module('../src/server/email.ts', { namedExports: {
  sendBookingConfirmation: async () => {}, sendWaiverPacket: async () => {},
  sendDepositSettlement: () => { throw new Error('Unexpected deposit settlement'); },
} });
mock.module('../src/server/deposits.ts', { namedExports: {
  createDepositLink: () => { throw new Error('Unexpected deposit creation'); }, depositPayUrl: () => 'https://example.invalid/deposit',
} });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const client = bookingsRouter.createCaller({ isAdmin: false });
const admin = bookingsRouter.createCaller({ isAdmin: true });
const input = { boatId: 1, customerName: 'Synthetic renter', customerEmail: 'test@example.invalid',
  charterDate: '2099-01-01', duration: 'custom' as const, charterType: 'cruising' as const, guestCount: 2 };
beforeEach(() => { writes.length = 0; });
const saved = () => writes.find(w => w.table === schema.bookings)?.values;

test('public date-range booking rejects missing or whitespace-only overnight address before any DB write', async () => {
  for (const stayAddress of [undefined, ' \n\t ']) {
    await assert.rejects(client.create({ ...input, endDate: '2099-01-03', stayAddress }), /overnight.*address/i);
    assert.equal(writes.length, 0);
  }
});

test('public legacy multi_day duration without an end date still requires overnight address', async () => {
  await assert.rejects(client.create({ ...input, duration: 'multi_day', stayAddress: '  ' }), /overnight.*address/i);
  assert.equal(writes.length, 0);
});

test('public multi-day address is trimmed and persisted on the booking', async () => {
  await client.create({ ...input, endDate: '2099-01-03', stayAddress: '  123 Marina Way, Slip B-2  ' });
  assert.equal(saved()?.stayAddress, '123 Marina Way, Slip B-2');
});

test('same-day public booking does not require an overnight address', async () => {
  await client.create({ ...input, duration: 'full_day', endDate: input.charterDate });
  assert.equal(saved()?.stayAddress, undefined);
});

test('admin manual multi-day booking stays optional and preserves any supplied address', async () => {
  await admin.create({ ...input, duration: 'multi_day', endDate: '2099-01-03', skipPayment: true });
  assert.equal(saved()?.stayAddress, undefined);
  writes.length = 0;
  await admin.create({ ...input, duration: 'multi_day', endDate: '2099-01-03', skipPayment: true, stayAddress: '  Marina Slip 4  ' });
  assert.equal(saved()?.stayAddress, 'Marina Slip 4');
});

test('legacy multi_day public booking with an address is accepted and persisted', async () => {
  await client.create({ ...input, duration: 'multi_day', stayAddress: '  Marina Slip 4  ' });
  assert.equal(saved()?.stayAddress, 'Marina Slip 4');
});
