import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRentalCheckout } from '../src/server/rental-checkout.ts';
const request: any = { cents: 50000, type: 'rental_balance', booking: { id: 1, bookingRef: 'SYNTHETIC', customerEmail: 'test@example.invalid' }, idempotencyKey: 'collection-1-rental_balance-0' };
test('provider adapter durably reserves retry key before Stripe and tags exact booking charge', async () => {
 const actions: string[] = [];
 const pool: any = { query: async () => { actions.push('reserve'); return { rows: [{ age_seconds: 1 }] }; } };
 const stripe: any = { checkout: { sessions: { create: async (data: any, options: any) => {
   actions.push('stripe'); assert.equal(data.line_items[0].price_data.unit_amount, 50000);
   assert.equal(data.metadata.collection, 'rental_v1'); assert.equal(data.metadata.bookingId, '1');
   assert.equal(options.idempotencyKey, request.idempotencyKey);
   return { id: 'cs_1', url: 'https://checkout.example.invalid', status: 'open' };
 } } } };
 const result = await createRentalCheckout(pool, stripe, 'https://example.invalid')(request);
 assert.equal(result.id, 'cs_1'); assert.deepEqual(actions, ['reserve', 'stripe']);
});
test('ambiguous old checkout attempt fails closed after provider idempotency retention window', async () => {
 const pool: any = { query: async () => ({ rows: [{ age_seconds: 90000 }] }) };
 const stripe: any = { checkout: { sessions: { create: async () => { throw new Error('must not call Stripe'); } } } };
 await assert.rejects(createRentalCheckout(pool, stripe, 'https://example.invalid')(request), /manual review/);
});
