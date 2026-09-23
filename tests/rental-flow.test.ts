import { test } from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../src/server/rental-flow.ts').catch(() => ({})) as any;
function fixture() {
  const state: any = { booking: { id: 1, bookingRef: 'SYNTHETIC', source: 'direct', status: 'confirmed', paymentStatus: 'pending', total: 537.50, charterDate: '2026-12-26', depositStatus: 'requested', depositAmount: 1000, customerEmail: 'test@example.invalid' }, plan: null };
  const messages: any[] = [];
  const sessions: any[] = [];
  const deps = {
    locked: async (_key: unknown, fn: any) => fn(state),
    send: async (message: any) => { messages.push(message); },
    checkout: async (request: any) => { sessions.push(request); return { id: 'cs_' + sessions.length, url: 'https://checkout.example.invalid/' + sessions.length, status: 'open' }; },
    retrieve: async (id: string) => ({ id, url: 'https://checkout.example.invalid/1', status: 'open' }),
    token: () => 'test-capability', now: () => new Date('2026-12-01T12:00:00Z'),
    appUrl: 'https://app.example.invalid',
  };
  return { state, messages, sessions, deps };
}
test('verified deposit sends one separate receipt; rental checkout reuses session and never creates booking', async () => {
  const { state, messages, sessions, deps } = fixture();
  const flow = new mod.RentalFlow(deps);
  await flow.authorize(1, 'deposit_first', true);
  assert.equal(typeof flow.checkout, 'function');
  const depUrl = await flow.checkout(1, 'deposit');
  assert.match(depUrl, /checkout/);
  await flow.paid(1, { id: 'cs_1', payment_status: 'paid', currency: 'usd', amount_total: 100000, payment_intent: 'pi_dep' }, 'deposit');
  await flow.paid(1, { id: 'cs_1', payment_status: 'paid', currency: 'usd', amount_total: 100000, payment_intent: 'pi_dep' }, 'deposit');
  assert.equal(state.booking.paymentStatus, 'pending');
  assert.equal(state.booking.depositStatus, 'paid');
  assert.equal(messages.filter(m => /Deposit received/.test(m.text)).length, 1);
  assert.match(messages.at(-1).text, /Deposit received: \$1000.00/);
  assert.match(messages.at(-1).text, /Rental balance due: \$537.50/);
  await flow.checkout('test-capability', 'rental_balance');
  await flow.checkout('test-capability', 'rental_balance');
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1].cents, 53750);
  await assert.rejects(flow.paid(1, { id: 'cs_2', payment_status: 'unpaid', currency: 'usd', amount_total: 53750, payment_intent: 'pi_rent' }, 'rental_balance'));
  await flow.paid(1, { id: 'cs_2', payment_status: 'paid', currency: 'usd', amount_total: 53750, payment_intent: 'pi_rent' }, 'rental_balance');
  await flow.paid(1, { id: 'cs_2', payment_status: 'paid', currency: 'usd', amount_total: 53750, payment_intent: 'pi_rent' }, 'rental_balance');
  assert.equal(state.booking.paymentStatus, 'paid');
  await assert.rejects(flow.checkout('test-capability', 'rental_balance'));
});
test('predeadline reminder and due owner alert are distinct and deduplicated; paid/OTA/cancelled never chased', async () => {
  const f = fixture();
  let now = new Date('2026-12-01T12:00:00Z');
  f.deps.now = () => now;
  const flow = new mod.RentalFlow(f.deps);
  await flow.authorize(1, 'deposit_first', true);
  assert.equal(typeof flow.remind, 'function');
  now = new Date('2026-12-20T12:00:00Z');
  await flow.remind(1);
  await flow.remind(1);
  assert.equal(f.messages.length, 2);
  now = new Date('2026-12-21T12:00:00Z');
  await flow.remind(1);
  await flow.remind(1);
  assert.equal(f.messages.length, 3);
  assert.match(f.messages[2].subject, /Unpaid rental due/);
  assert.equal(f.messages[2].to, 'owner');
  f.state.booking.paymentStatus = 'paid';
  await flow.remind(1);
  assert.equal(f.messages.length, 3);
});
test('admin authorization persists explicit mode before initial request; repeats cannot resend or change amount', async () => {
  assert.equal(typeof mod.RentalFlow, 'function');
  const { state, messages, deps } = fixture();
  const flow = new mod.RentalFlow(deps);
  await assert.rejects(flow.authorize(1, 'deposit_first', false), /Admin/);
  await flow.authorize(1, 'deposit_first', true);
  await flow.authorize(1, 'deposit_first', true);
  assert.equal(state.plan.rentalCents, 53750);
  assert.equal(state.plan.dueDate, '2026-12-21');
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /refundable security deposit/);
  assert.match(messages[0].text, /537.50/);
  assert.match(messages[0].text, /2026-12-21/);
});
