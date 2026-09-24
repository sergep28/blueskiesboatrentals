import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRentalStore } from '../src/server/rental-store.ts';
function fixture() {
  const queries: { sql: string; args: any[] }[] = [];
  let released = false;
  const client = { query: async (sql: string, args: any[] = []) => {
    queries.push({ sql, args });
    if (sql.includes('FROM bookings')) return { rows: [{ id: 1, user_id: 2, referral_code: 'SYNTHETIC_REF', referral_discount: 25, loyalty_points_earned: 5, booking_ref: 'SYNTHETIC', source: 'direct', payment_status: 'pending', deposit_status: 'requested', total: 500, charter_date: '2099-12-26', deposit_amount: 1000, customer_email: 'test@example.invalid' }] };
    return { rows: [] };
  }, release: () => { released = true; } };
  return { store: createRentalStore({ connect: async () => client } as any), queries, released: () => released };
}
test('actual store locks booking, persists plan/payment/financial effects and commits atomically', async () => {
  const f = fixture();
  await f.store.locked(1, async s => {
    assert.equal(s.booking.bookingRef, 'SYNTHETIC');
    s.plan = { token: 'test', snapshot: 'test', mode: 'deposit_first', rentalCents: 50000, dueDate: '2099-12-21', startDate: '2099-12-26', depositCents: 100000, messages: {}, rentalGeneration: 0, depositGeneration: 0, rentalPaid: true };
    s.payment = { type: 'rental_balance', sessionId: 'cs_1', intentId: 'pi_1' };
  });
  assert.equal(f.queries[0].sql, 'BEGIN');
  assert.match(f.queries[1].sql, /FOR UPDATE/);
  assert.ok(f.queries.some(q => /INSERT INTO rental_payments/.test(q.sql)));
  assert.ok(f.queries.some(q => /UPDATE bookings/.test(q.sql)));
  assert.deepEqual(f.queries.find(q => /UPDATE users/.test(q.sql))!.args, [2, 500, 5]);
  assert.deepEqual(f.queries.find(q => /INSERT INTO referral_transactions/.test(q.sql))!.args, ['SYNTHETIC_REF', 1, 500]);
  assert.ok(f.queries.some(q => /INSERT INTO rental_collections/.test(q.sql)));
  assert.equal(f.queries.at(-1)!.sql, 'COMMIT');
  assert.equal(f.released(), true);
});
test('store rolls back and releases connection on invalid payment', async () => {
  const f = fixture();
  await assert.rejects(f.store.locked(1, async () => { throw new Error('invalid evidence'); }), /invalid evidence/);
  assert.equal(f.queries.at(-1)!.sql, 'ROLLBACK');
  assert.equal(f.released(), true);
});
