import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

// No application DB/email/payment module may load: all external boundaries mocked.
process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
const writes: { table: unknown; values: any }[] = [];
const emails: string[] = [];
const boat = { id: 1, status: 'active', name: 'Test boat', priceFullDay: 500, priceHalfDay: 300 };
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
  update: (table: unknown) => ({ set: (values: any) => {
    writes.push({ table, values });
    return { where: () => Promise.resolve() };
  } }),
};
mock.module('stripe', { defaultExport: class UnexpectedStripe {
  constructor() { throw new Error('Stripe must not initialize without configuration'); }
} });
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('../src/server/email.ts', { namedExports: {
  sendBookingConfirmation: () => { emails.push('confirmation'); },
  sendWaiverPacket: () => { emails.push('waiver'); },
  sendDepositSettlement: () => { throw new Error('Unexpected settlement'); },
} });
mock.module('../src/server/deposits.ts', { namedExports: {
  createDepositLink: () => { throw new Error('Unexpected payment action'); },
  depositPayUrl: () => { throw new Error('Unexpected payment action'); },
} });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const caller = bookingsRouter.createCaller({ isAdmin: true });
const input = { boatId: 1, customerName: 'Synthetic renter', customerEmail: 'test@example.invalid',
  charterDate: '2099-01-01', duration: 'full_day' as const, charterType: 'cruising' as const, guestCount: 2 };
beforeEach(() => { writes.length = 0; emails.length = 0; });
test('missing checkout configuration leaves public booking pending without emails or benefits', async () => {
  const response = await bookingsRouter.createCaller({ isAdmin: false }).create(input);
  assert.equal(response.checkoutUnavailable, true);
  assert.equal(response.checkoutUrl, null);
  const booking = Object.assign({}, ...writes.filter(w => w.table === schema.bookings).map(w => w.values));
  assert.equal(booking.paymentStatus, 'pending');
  assert.equal(booking.status, 'pending');
  assert.equal(writes.filter(w => w.table === schema.users).length, 0);
  assert.deepEqual(emails, []);
});
for (const status of ['confirmed', 'completed', 'cancelled', 'pending'] as const) {
  test(`import ${status} does not infer money movement from reservation status`, async () => {
    await caller.importBookings([{ customerName: 'Synthetic', customerEmail: input.customerEmail,
      charterDate: input.charterDate, total: 500, status }]);
    const booking = writes.find(w => w.table === schema.bookings)!.values;
    assert.equal(booking.paymentStatus, 'pending');
    assert.equal(booking.status, status);
    assert.equal(writes.filter(w => w.table === schema.users).length, 0);
  });
}
test('import preserves explicitly recorded payment independently of reservation status', async () => {
  await caller.importBookings([{ customerName: 'Synthetic', charterDate: input.charterDate,
    total: 500, status: 'pending', paymentStatus: 'paid' }]);
  assert.equal(writes.find(w => w.table === schema.bookings)!.values.paymentStatus, 'paid');
});
test('public clients cannot select manual collection or spoof an OTA source', async () => {
  const publicCaller = bookingsRouter.createCaller({ isAdmin: false });
  await assert.rejects(publicCaller.create({ ...input, skipPayment: true }), /Admin/);
  await assert.rejects(publicCaller.create({ ...input, source: 'boatsetter' }), /Admin/);
  assert.equal(writes.length, 0);
});
test('manual booking does not record payment, spending, or paid confirmation without evidence', async () => {
  await caller.create({ ...input, skipPayment: true });
  const booking = Object.assign({}, ...writes.filter(w => w.table === schema.bookings).map(w => w.values));
  assert.equal(booking.paymentStatus, 'pending');
  assert.equal(booking.status, 'confirmed');
  assert.equal(writes.filter(w => w.table === schema.users).length, 0);
  assert.deepEqual(emails, ['waiver']);
});
