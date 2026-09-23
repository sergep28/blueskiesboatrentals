import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.NODE_ENV = 'test';
// Synthetic key only selects the configured branch. The Stripe module is mocked
// before importing the router; no Stripe/email/deposit/DB implementation loads.
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_only';
const writes: { table: unknown; values: any }[] = [];
const sessions: any[] = [];
const waivers: any[] = [];
const depositRefs: string[] = [];
let saved: any;
const boat = { id: 1, status: 'active', name: 'Test boat', priceFullDay: 500, priceHalfDay: 300 };
const user = { id: 2, bookingCount: 0, totalSpent: 0, loyaltyPoints: 0 };
const partner = { id: 4, status: 'active', referralCode: 'TESTREF', commissionRate: 10 };
const db = {
  select: () => ({ from: (table: unknown) => {
    const rows = table === schema.boats ? [boat] : table === schema.users ? [user]
      : table === schema.partners ? [partner] : table === schema.bookings && saved ? [saved] : [];
    return Object.assign(Promise.resolve(rows), { where: () => Promise.resolve(rows) });
  } }),
  insert: (table: unknown) => ({ values: (values: any) => {
    writes.push({ table, values });
    if (table === schema.bookings) saved = { ...values, id: 3 };
    return Object.assign(Promise.resolve(), { returning: () => Promise.resolve([{ id: 3 }]) });
  } }),
  update: (table: unknown) => ({ set: (values: any) => ({ where: async () => {
    writes.push({ table, values });
    if (table === schema.bookings) Object.assign(saved, values);
  } }) }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('stripe', { defaultExport: class FakeStripe {
  checkout = { sessions: { create: async (input: any) => {
    sessions.push(input);
    return { id: 'cs_mock', url: 'https://checkout.example.invalid/session' };
  } } };
} });
mock.module('../src/server/email.ts', { namedExports: {
  sendBookingConfirmation: () => { throw new Error('Unexpected paid confirmation'); },
  sendWaiverPacket: (packet: any) => { waivers.push(packet); },
  sendDepositSettlement: () => { throw new Error('Unexpected settlement'); },
} });
mock.module('../src/server/deposits.ts', { namedExports: {
  createDepositLink: () => { throw new Error('Unexpected deposit checkout creation'); },
  depositPayUrl: (ref: string) => { depositRefs.push(ref); return `https://example.invalid/deposit/${ref}`; },
} });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const input = { boatId: 1, customerName: 'Synthetic renter', customerEmail: 'test@example.invalid',
  charterDate: '2099-01-01', duration: 'full_day' as const, charterType: 'cruising' as const,
  guestCount: 2, referralCode: 'TESTREF' };
beforeEach(() => { writes.length = sessions.length = waivers.length = depositRefs.length = 0; saved = undefined; });
test('configured public checkout preserves Stripe request and pending payment without financial accrual', async () => {
  const response = await bookingsRouter.createCaller({ isAdmin: false }).create(input);
  assert.equal(response.checkoutUrl, 'https://checkout.example.invalid/session');
  assert.notEqual(response.checkoutUnavailable, true);
  assert.equal(saved.paymentStatus, 'pending');
  assert.equal(saved.status, 'pending');
  assert.equal(saved.stripeSessionId, 'cs_mock');
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].line_items[0].price_data.unit_amount, Math.round(response.total * 100));
  assert.equal(sessions[0].customer_email, input.customerEmail);
  assert.equal(sessions[0].metadata.bookingRef, response.bookingRef);
  assert.match(sessions[0].success_url, new RegExp(`/booking/success/${response.bookingRef}$`));
  assert.deepEqual(writes.map(w => w.table), [schema.bookings, schema.bookings]);
  assert.deepEqual(waivers, []);
  assert.deepEqual(depositRefs, []);
});
test('configured manual booking preserves waiver/deposit request but not rental payment or referral accrual', async () => {
  const response = await bookingsRouter.createCaller({ isAdmin: true }).create({ ...input, skipPayment: true });
  assert.equal(response.checkoutUrl, null);
  assert.notEqual(response.checkoutUnavailable, true);
  assert.equal(saved.paymentStatus, 'pending');
  assert.equal(saved.status, 'confirmed');
  assert.equal(saved.depositStatus, 'requested');
  assert.equal(saved.depositAmount, 1000);
  assert.equal(sessions.length, 0);
  assert.deepEqual(depositRefs, [response.bookingRef]);
  assert.equal(waivers.length, 1);
  assert.equal(waivers[0].depositLink, `https://example.invalid/deposit/${response.bookingRef}`);
  assert.equal(waivers[0].depositAmount, 1000);
  assert.deepEqual(writes.map(w => w.table), [schema.bookings, schema.bookings, schema.bookings]);
});
