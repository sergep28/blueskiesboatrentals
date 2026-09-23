import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleCollectionWebhook } from '../src/server/rental-webhook.ts';
import { RentalFlow } from '../src/server/rental-flow.ts';
const session: any = { id: 'cs_rent', payment_status: 'paid', currency: 'usd', amount_total: 50000, payment_intent: 'pi_rent', metadata: { collection: 'rental_v1', type: 'rental_balance', bookingId: '1', bookingRef: 'SYNTHETIC' } };
function fixture() {
 const state: any = { booking: { id: 1, bookingRef: 'SYNTHETIC', source: 'direct', total: 500, charterDate: '2099-12-26', depositAmount: 1000, depositStatus: 'requested', paymentStatus: 'pending', status: 'confirmed', customerEmail: 'test@example.invalid' }, plan: null };
 const locked: any = async (_key: any, fn: any) => fn(state);
 const flow = new RentalFlow({ locked, now: () => new Date('2099-12-01'), token: () => 'test', appUrl: 'https://example.invalid', send: async () => {}, checkout: async () => ({ id: 'cs_rent', url: 'https://checkout.example.invalid', status: 'open' }), retrieve: async () => ({ id: 'cs_rent', url: null, status: 'complete' }) });
 return { state, flow, locked };
}
test('webhook verifies metadata booking then exact evidence and does not fall through to website handler', async () => {
 const { state, flow, locked } = fixture();
 await flow.authorize(1, 'deposit_first', true); await flow.checkout(1, 'rental_balance');
 assert.equal(await handleCollectionWebhook(session, flow, locked), true);
 assert.equal(state.booking.paymentStatus, 'paid');
 await handleCollectionWebhook(session, flow, locked);
});
test('webhook rejects wrong reference, unpaid, amount, currency, session and unknown type', async () => {
 for (const patch of [{ metadata: { ...session.metadata, bookingRef: 'OTHER' } }, { payment_status: 'unpaid' }, { amount_total: 1 }, { currency: 'eur' }, { id: 'cs_wrong' }, { metadata: { ...session.metadata, type: 'other' } }]) {
   const { state, flow, locked } = fixture();
   await flow.authorize(1, 'deposit_first', true); await flow.checkout(1, 'rental_balance');
   await assert.rejects(handleCollectionWebhook({ ...session, ...patch }, flow, locked));
   assert.equal(state.booking.paymentStatus, 'pending');
 }
});
test('ordinary website checkout is not intercepted', async () => {
 const { flow, locked } = fixture();
 assert.equal(await handleCollectionWebhook({ ...session, metadata: { bookingRef: 'WEBSITE' } }, flow, locked), false);
});
