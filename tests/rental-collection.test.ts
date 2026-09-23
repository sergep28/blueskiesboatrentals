import { test } from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../src/server/rental-collection.ts').catch(() => ({})) as any;
const booking = { id: 1, bookingRef: 'SYNTHETIC', source: 'direct', status: 'confirmed', paymentStatus: 'pending', total: 537.50, charterDate: '2026-12-26', depositStatus: 'requested', depositAmount: 1000, customerEmail: 'test@example.invalid' };
test('checkout rejects changed, paid, cancelled and OTA records; deposit is never credited to rent', () => {
  assert.equal(typeof module.outstandingRentalCents, 'function');
  const plan = { mode: 'deposit_first', rentalCents: 53750, dueDate: '2026-12-21' };
  assert.equal(module.outstandingRentalCents(booking, plan), 53750);
  for (const override of [{ total: 500 }, { source: 'boatsetter' }, { paymentStatus: 'paid' }, { status: 'cancelled' }]) {
    assert.throws(() => module.outstandingRentalCents({ ...booking, ...override }, plan));
  }
});
test('verified payment must match session, currency, exact amount and successful status', () => {
  assert.equal(typeof module.verifyCollectionPayment, 'function');
  const session = { id: 'cs_synthetic', payment_status: 'paid', currency: 'usd', amount_total: 53750, payment_intent: 'pi_synthetic' };
  assert.equal(module.verifyCollectionPayment(session, 'cs_synthetic', 53750), 'pi_synthetic');
  for (const override of [{ id: 'other' }, { payment_status: 'unpaid' }, { currency: 'eur' }, { amount_total: 53749 }]) {
    assert.throws(() => module.verifyCollectionPayment({ ...session, ...override }, 'cs_synthetic', 53750));
  }
});
test('only explicit admin authorization snapshots direct rental amount, independent deposit and deadline', async () => {
  assert.equal(typeof module.authorizeCollection, 'function');
  const plan = module.authorizeCollection(booking, 'deposit_first', true, new Date('2026-12-01T12:00:00Z'));
  assert.equal(plan.rentalCents, 53750);
  assert.equal(plan.dueDate, '2026-12-21');
  assert.equal(plan.mode, 'deposit_first');
  assert.throws(() => module.authorizeCollection(booking, 'deposit_first', false), /Admin/);
  for (const source of ['boatsetter', 'getmyboat', 'website', 'other']) {
    assert.throws(() => module.authorizeCollection({ ...booking, source }, 'deposit_first', true), /direct/);
  }
  for (const override of [{ paymentStatus: 'paid' }, { paymentStatus: 'refunded' }, { status: 'cancelled' }]) {
    assert.throws(() => module.authorizeCollection({ ...booking, ...override }, 'deposit_first', true), /eligible/);
  }
});
