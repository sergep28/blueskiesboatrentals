import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;
process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED = 'true';
let booking: any, plan: any, request: any, saved: any;
let queries: string[] = [], sent: any[] = [], legacy = 0, failPlan = false, failSend = false, failAfterSend = false;
const client = { async query(sql: string, args: any[] = []) {
  queries.push(sql);
  if (sql === 'BEGIN') saved = structuredClone({ booking, plan, request });
  if (sql === 'ROLLBACK') ({ booking, plan, request } = saved);
  if (sql.includes('FROM rental_creation_requests')) return { rows: request ? [request] : [] };
  if (sql.includes('INSERT INTO rental_creation_requests')) request = { request_hash: args[1], booking_id: args[2] };
  if (sql.includes('FROM bookings')) { if (failAfterSend && sent.length) throw new Error('database unavailable after send'); return { rows: booking ? [booking] : [] }; }
  if (sql.includes('SELECT state FROM rental_collections')) return { rows: plan ? [{ state: JSON.stringify(plan) }] : [] };
  if (sql.includes('INSERT INTO rental_collections')) { if (failPlan) throw new Error('plan write failed'); plan = JSON.parse(args[2]); }
  return { rows: [] };
}, release() {} };
const boat = { id: 1, name: 'Fixture', priceFullDay: 500, priceHalfDay: 250 };
function database(transactional: boolean) { return {
  select() { return { from(table: any) { return { where: async () => table === schema.boats ? [boat] : [{ id: 2 }] }; } }; },
  insert(table: any) { assert.ok(transactional, 'booking writes must use transaction client'); return { values(value: any) { return { returning: async () => {
    assert.equal(table, schema.bookings);
    booking = Object.fromEntries(Object.entries({ ...value, id: 42 }).map(([k, v]) => [k.replace(/[A-Z]/g, c => '_' + c.toLowerCase()), v]));
    queries.push('BOOKING INSERT');
    return [{ id: 42 }];
  } }; } }; },
}; }
mock.module('../src/db/index.ts', { namedExports: { db: database(false), schema, pool: { options: {}, connect: async () => client } } });
mock.module('drizzle-orm/node-postgres', { namedExports: { drizzle: (c: any) => { assert.equal(c, client); return database(true); } } });
mock.module('../src/server/email.ts', { namedExports: { sendWaiverPacket() { legacy++; }, sendDepositSettlement() {} } });
mock.module('../src/server/deposits.ts', { namedExports: { createDepositLink() { legacy++; }, depositPayUrl() { legacy++; } } });
// Real flow/store/runtime; only external provider constructors and DB boundary are replaced.
mock.module('stripe', { defaultExport: class {} });
mock.module('resend', { namedExports: { Resend: class { emails = { send: async (message: any) => {
  assert.ok(plan, 'plan must be committed before sending');
  assert.equal(queries.at(-1), 'COMMIT');
  sent.push(message);
  if (failSend) throw new Error('provider uncertain');
  return { data: { id: 'fixture-message' } };
} }; } } });
mock.module('../src/server/staging.ts', { namedExports: { guardResend: (m: any) => m } });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
process.env.STRIPE_SECRET_KEY = 'fixture'; process.env.RESEND_API_KEY = 'fixture';
const admin = bookingsRouter.createCaller({ isAdmin: true } as any);
const input = { boatId: 1, customerName: 'Fixture', customerEmail: 'fixture@example.invalid', charterDate: '2099-12-26', duration: 'full_day' as const, charterType: 'cruising' as const, guestCount: 2, collectionMode: 'deposit_first' as const, source: 'direct' as const, creationRequestKey: 'd431f4b4-9238-4cac-9d35-c702ab42670c' };
test('send failure returns saved booking warning; same durable request never creates or emails twice', async () => {
  reset(); failSend = true;
  const first: any = await admin.create(input);
  assert.equal(first.collection.communicationError, true);
  assert.equal(first.collection.messages.initial, 'uncertain');
  const again: any = await admin.create(input);
  assert.equal(again.bookingRef, first.bookingRef);
  assert.equal(again.collection.communicationError, true);
  assert.equal(queries.filter(q => q === 'BOOKING INSERT').length, 1);
  assert.equal(sent.length, 1);
  await assert.rejects(admin.create({ ...input, guestCount: 3 }), /request.*different/i);
});
test('enrollment failure rolls booking/request back and never sends', async () => {
  reset(); failPlan = true;
  await assert.rejects(admin.create(input), /plan write failed/);
  assert.equal(booking, undefined); assert.equal(plan, undefined); assert.equal(request, undefined);
  assert.equal(queries.at(-1), 'ROLLBACK'); assert.equal(sent.length, 0); assert.equal(legacy, 0);
});
test('public access, default-off gate, missing durable key and non-direct sources reject before writes', async () => {
  reset();
  const publicCaller = bookingsRouter.createCaller({ isAdmin: false } as any);
  await assert.rejects(publicCaller.create(input), /Admin/);
  delete process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED;
  await assert.rejects(admin.create(input), /disabled/);
  process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED = 'true';
  await assert.rejects(admin.create({ ...input, creationRequestKey: undefined }), /creationRequestKey/);
  for (const source of ['website', 'boatsetter', 'getmyboat', 'other'] as const) {
    await assert.rejects(admin.create({ ...input, source }), /direct sources/);
  }
  assert.equal(queries.length, 0); assert.equal(sent.length, 0);
});
test('post-commit database failure returns saved identity and explicit stale communication warning', async () => {
  reset(); failAfterSend = true;
  const result: any = await admin.create(input);
  assert.equal(result.bookingId, 42); assert.ok(plan); assert.ok(request);
  assert.equal(result.collection.enrolled, true);
  assert.equal(result.collection.communicationError, true);
  assert.equal(result.collection.statusUnavailable, true);
  assert.notEqual(result.collection.messages.initial, 'sent');
});
function reset() { booking = plan = request = undefined; queries = []; sent = []; legacy = 0; failPlan = failSend = failAfterSend = false; }
test('actual create endpoint atomically reserves pending rental, enrolls, commits then sends one collection/paperwork message', async () => {
  reset(); process.env.STRIPE_SECRET_KEY = 'fixture'; process.env.RESEND_API_KEY = 'fixture';
  const result: any = await admin.create(input);
  assert.equal(booking.payment_status, 'pending'); assert.equal(booking.status, 'confirmed');
  assert.equal(booking.source, 'direct'); assert.equal(booking.deposit_status, 'requested');
  assert.equal(result.collection.enrolled, true); assert.equal(result.collection.communicationError, false);
  assert.equal(result.collection.rentalBalanceCents, 53750); assert.equal(result.collection.depositCents, 100000);
  assert.equal(result.bookingId, 42); assert.equal(result.checkoutUrl, null);
  assert.equal(plan.snapshot.includes(booking.booking_ref), true);
  assert.equal(sent.length, 1); assert.equal(legacy, 0);
  assert.match(sent[0].text, /\/waiver\/.*\?renter=1/); assert.match(sent[0].text, /Crew waivers:/);
  assert.match(sent[0].text, /held separately/);
  const insertion = queries.indexOf('BOOKING INSERT'); const commit = queries.indexOf('COMMIT');
  assert.ok(insertion > queries.indexOf('BEGIN') && insertion < commit);
  assert.ok(queries.findIndex(q => q.includes('INSERT INTO rental_collections')) < commit);
});
