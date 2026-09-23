import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_offline_mock_only';
const writes: { table: unknown; values: any; action: 'insert' | 'update' }[] = [];
const sessions: any[] = [];
const boat = { id: 1, name: 'Synthetic boat', priceFullDay: 500, priceHalfDay: 300, priceMultiDay: 450 };
const user = { id: 2, bookingCount: 0, totalSpent: 0, loyaltyPoints: 0 };
let quote: any = null;
const db = {
  select: () => ({ from: (table: unknown) => {
    const rows = table === schema.boats ? [boat] : table === schema.users ? [user] : table === schema.quotes ? (quote ? [quote] : []) : [];
    const result = Promise.resolve(rows);
    return Object.assign(result, { where: () => Object.assign(Promise.resolve(rows), { limit: () => Promise.resolve(rows) }) });
  } }),
  insert: (table: unknown) => ({ values: (values: any) => {
    writes.push({ table, values, action: 'insert' as const });
    return { returning: async () => [{ id: 3 }] };
  } }),
  update: (table: unknown) => ({ set: (values: any) => ({ where: async () => { writes.push({ table, values, action: 'update' as const }); } }) }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
mock.module('stripe', { defaultExport: class MockStripe {
  checkout = { sessions: { create: async (payload: any) => {
    sessions.push(payload);
    return { id: 'cs_test_offline', url: 'https://example.invalid/checkout' };
  } } };
} });
mock.module('../src/server/email.ts', { namedExports: {
  sendBookingConfirmation: async () => {}, sendWaiverPacket: async () => {},
  sendDepositSettlement: () => { throw new Error('Unexpected deposit settlement'); },
} });
mock.module('../src/server/deposits.ts', { namedExports: {
  createDepositLink: () => { throw new Error('Unexpected deposit creation'); }, depositPayUrl: () => 'https://example.invalid/deposit',
} });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
const publicCaller = bookingsRouter.createCaller({ isAdmin: false });
const adminCaller = bookingsRouter.createCaller({ isAdmin: true });
const input = { boatId: 1, customerName: 'Synthetic renter', customerEmail: 'test@example.invalid',
  charterDate: '2099-01-01', duration: 'full_day' as const, charterType: 'cruising' as const, guestCount: 2 };
const validQuote = { code: 'BS-VALID', status: 'pending', boatId: 1, charterDate: input.charterDate,
  endDate: null, duration: input.duration, price: 210 };
beforeEach(() => { writes.length = 0; sessions.length = 0; quote = null; });
const saved = () => writes.find(w => w.action === 'insert' && w.table === schema.bookings)?.values;

test('public customPrice without a quote cannot set the subtotal', async () => {
  await assert.rejects(publicCaller.create({ ...input, customPrice: 1 }), /quote|price|admin/i);
  assert.equal(writes.length, 0);
  assert.equal(sessions.length, 0);
});

test('public skipPayment cannot mark a booking paid or grant loyalty', async () => {
  await assert.rejects(publicCaller.create({ ...input, skipPayment: true }), /payment|admin/i);
  assert.equal(writes.length, 0);
  assert.equal(sessions.length, 0);
});

test('public source cannot impersonate an OTA or manual booking', async () => {
  for (const source of ['boatsetter', 'direct'] as const) {
    await assert.rejects(publicCaller.create({ ...input, source }), /source|admin/i);
    assert.equal(writes.length, 0);
  }
});

test('ordinary website booking uses boat price and remains pending until checkout webhook', async () => {
  const result = await publicCaller.create(input);
  assert.equal(saved()?.subtotal, 500);
  assert.equal(saved()?.source, 'website');
  assert.equal(saved()?.paymentStatus, 'pending');
  assert.equal(saved()?.status, 'pending');
  assert.equal(result.total, 537.5);
  assert.equal(sessions[0]?.line_items[0].price_data.unit_amount, 53750);
  assert.equal(writes.some(w => w.table === schema.users && w.action === 'update'), false);
});

test('pending quote for exact trip supplies server price regardless of client customPrice', async () => {
  quote = { ...validQuote };
  const result = await publicCaller.create({ ...input, quoteCode: quote.code, customPrice: 1 });
  assert.equal(saved()?.subtotal, 210);
  assert.equal(result.total, 225.75);
  assert.equal(sessions[0]?.line_items[0].price_data.unit_amount, 22575);
  assert.equal(sessions[0]?.metadata.quoteCode, quote.code);
  assert.equal(quote.status, 'pending'); // status is updated by the existing client mutation after create
});

test('missing, inactive, or differently bound quote is rejected before writes', async () => {
  for (const candidate of [null, { ...validQuote, status: 'booked' }, { ...validQuote, boatId: 9 },
    { ...validQuote, charterDate: '2099-01-02' }, { ...validQuote, endDate: '2099-01-02' },
    { ...validQuote, duration: 'half_day_am' }]) {
    quote = candidate;
    await assert.rejects(publicCaller.create({ ...input, quoteCode: validQuote.code }), /quote/i);
    assert.equal(writes.length, 0);
    assert.equal(sessions.length, 0);
  }
});

test('admin custom price/manual/OTA workflow retains its existing authority', async () => {
  await adminCaller.create({ ...input, customPrice: 125, source: 'boatsetter', skipPayment: true });
  assert.equal(saved()?.subtotal, 125);
  assert.equal(saved()?.total, 125);
  assert.equal(saved()?.source, 'boatsetter');
  assert.equal(sessions.length, 0);
  assert.equal(saved()?.paymentStatus, 'pending');
  assert.equal(writes.some(w => w.table === schema.bookings && w.values.status === 'confirmed'), true);
});
