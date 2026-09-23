import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RentalFlow } from '../src/server/rental-flow.ts';
function fixture() {
  const state: any = { booking: { id: 9, bookingRef: 'SYNTHETIC', source: 'direct', status: 'confirmed', paymentStatus: 'pending', total: 500, charterDate: '2099-12-26', endDate: '2099-12-28', depositStatus: 'paid', depositAmount: 1000, customerEmail: 'test@example.invalid' }, plan: null };
  const messages: any[] = [];
  const flow = new RentalFlow({ locked: async (_, fn) => fn(state), send: async m => { messages.push(m); }, token: () => 'capability', now: () => new Date('2099-12-01T12:00:00Z'), appUrl: 'https://example.invalid', checkout: async () => ({ id: 'cs_rental', url: 'https://checkout.example.invalid', status: 'open' }), retrieve: async id => ({ id, url: 'https://checkout.example.invalid', status: 'open' }) });
  return { state, messages, flow };
}
test('historical explicit opt-in preserves paid deposit and sends zero balance receipt after rental paid', async () => {
  const { state, messages, flow } = fixture();
  await flow.authorize(9, 'deposit_first', true);
  assert.doesNotMatch(messages[0].text, /Pay refundable security deposit:/);
  await flow.checkout('capability', 'rental_balance');
  await flow.paid(9, { id: 'cs_rental', payment_status: 'paid', currency: 'usd', amount_total: 50000, payment_intent: 'pi_rental' }, 'rental_balance');
  assert.equal(state.booking.depositStatus, 'paid');
  assert.match(messages.at(-1).text, /Rental balance due: \$0.00/);
  assert.doesNotMatch(messages.at(-1).text, /Pay Rental Balance:/);
});
test('verified deposit preserves owner alert and deduplicates it independently of customer receipt', async () => {
  const { state, messages, flow } = fixture();
  state.booking.depositStatus = 'requested';
  await flow.authorize(9, 'deposit_first', true);
  await flow.checkout('capability', 'deposit');
  const session = { id: 'cs_rental', payment_status: 'paid', currency: 'usd', amount_total: 100000, payment_intent: 'pi_dep' };
  await flow.paid(9, session, 'deposit');
  await flow.paid(9, session, 'deposit');
  assert.equal(messages.filter(m => m.to === 'owner').length, 1);
  assert.match(messages.find(m => m.to === 'owner').subject, /Security deposit received/);
});
test('trip end or direct source change invalidates authorized snapshot', async () => {
  for (const change of [{ endDate: '2099-12-29' }, { source: 'phone' }, { depositAmount: 2000 }]) {
    const { state, flow } = fixture();
    await flow.authorize(9, 'deposit_first', true);
    Object.assign(state.booking, change);
    await assert.rejects(flow.checkout('capability', 'rental_balance'), /changed|unavailable/i);
  }
});
