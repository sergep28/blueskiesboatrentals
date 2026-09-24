import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

// Retain hook state and invoke actual rendered controls without browser/services.
let index = 0;
const state = new Map<number, any>();
mock.module('react', { namedExports: { ...React,
  useState: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, initial);
    return [state.get(slot), (next: any) => state.set(slot, typeof next === 'function' ? next(state.get(slot)) : next)];
  },
  useRef: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, { current: initial });
    return state.get(slot);
  },
} });
let data: any, error: any, pending = false, options: any;
let refreshing = false;
const calls: any[] = [];
let refreshes = 0;
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: { bookings: {
  rentalCollectionStatus: { useQuery: (input: any) => {
    assert.equal(input.bookingId, 42);
    return { data, error, isFetching: refreshing, refetch: async () => { refreshes++; return { data }; } };
  } },
  enrollRentalCollection: { useMutation: (opts: any) => {
    options = opts;
    return { isPending: pending, mutate: (input: any) => calls.push(input) };
  } },
} } } });
const { default: RentalCollectionPanel } = await import('../src/client/pages/admin/RentalCollectionPanel.tsx');
const booking = { id: 42, source: 'direct', status: 'confirmed', paymentStatus: 'pending', total: 2500, depositAmount: 1000, depositStatus: 'none', customerEmail: 'test@example.invalid' };
let tree: any;
function render(overrides = {}, props = {}) {
  index = 0;
  tree = RentalCollectionPanel({ booking: { ...booking, ...overrides }, ...props });
  return renderToStaticMarkup(tree);
}
function nodes(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function button(label: string) {
  const result = nodes(tree).find(n => n.type === 'button' && renderToStaticMarkup(n).includes(label));
  assert.ok(result, `Missing button: ${label}`);
  return result.props;
}
beforeEach(() => { state.clear(); calls.length = 0; data = { enrolled: false }; error = null; pending = false; refreshing = false; refreshes = 0; });

for (const overrides of [
  { source: 'boatsetter' }, { source: 'getmyboat' }, { source: 'website' }, { source: 'other' },
  { paymentStatus: 'paid' }, { paymentStatus: 'refunded' }, { status: 'cancelled' },
  { total: 0 }, { depositAmount: 0 }, { stripeSessionId: 'legacy' },
  { depositStripeSessionId: 'legacy', depositStatus: 'requested' },
]) {
  test(`ineligible booking cannot enroll: ${JSON.stringify(overrides)}`, () => {
    assert.doesNotMatch(render(overrides), /Set up deposit-first|Confirm enrollment/);
    assert.match(render(overrides), /not eligible|manual review/);
    assert.deepEqual(calls, []);
  });
}
test('loading, failed status and unsaved booking changes fail closed', () => {
  data = undefined;
  assert.doesNotMatch(render(), /Set up deposit-first/);
  error = { message: 'Offline' };
  assert.match(render(), /Offline/);
  assert.doesNotMatch(render(), /Set up deposit-first/);
  error = null; data = { enrolled: false };
  assert.match(render({}, { blocked: true }), /Save.*before/);
  assert.doesNotMatch(render({}, { blocked: true }), /Set up deposit-first/);
});
test('paid deposit remains eligible and phone/walkin are supported', () => {
  for (const source of ['direct', 'phone', 'walkin']) {
    assert.match(render({ source, depositStatus: 'paid', depositStripeSessionId: 'settled' }), /Set up deposit-first/);
  }
});

const enrolled = { enrolled: true, mode: 'deposit_first', dueDate: '2026-12-21', rentalTotalCents: 250000, rentalBalanceCents: 250000, depositCents: 100000, depositStatus: 'paid', rentalUrl: 'https://example.invalid/rental/private', depositUrl: 'https://example.invalid/rental/private/deposit', messages: { initial: 'sent', deposit_receipt: 'uncertain' } };
test('enrolled readback separates rental/deposit, due date, private copy-only links and uncertain delivery', async () => {
  data = enrolled;
  const html = render();
  assert.match(html, /Rental total:.*\$2,500.00/);
  assert.match(html, /Rental balance:.*\$2,500.00/);
  assert.match(html, /Refundable security deposit:.*\$1,000.00/);
  assert.match(html, /Deposit status:.*paid/);
  assert.match(html, /2026-12-21/);
  assert.match(html, /uncertain/);
  assert.match(html, /manual.*review/i);
  assert.match(html, /Private/);
  assert.doesNotMatch(html, /Set up deposit-first|href=.*rental\/private/);
  const copied: string[] = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (s: string) => { copied.push(s); } } } });
  await button('Copy private rental link').onClick();
  assert.deepEqual(copied, [enrolled.rentalUrl]);
  assert.match(render(), /Link copied/);
  assert.deepEqual(calls, []);
  data = { ...enrolled, rentalBalanceCents: 0, messages: { initial: 'sending' } };
  assert.match(render({ paymentStatus: 'paid' }), /Rental status:.*paid/);
  assert.match(render({ paymentStatus: 'paid' }), /sending/);
});
test('collection refresh explicitly distinguishes independently cached surrounding financial widgets', async () => {
  data = enrolled;
  let html = render();
  assert.match(html, /Refresh status updates only this collection panel/);
  assert.match(html, /surrounding booking, payment, deposit and trip-readiness widgets may be stale/i);
  await button('Refresh status').onClick();
  data = { ...enrolled, rentalBalanceCents: 0, depositStatus: 'refunded' };
  html = render();
  assert.match(html, /Rental balance:.*\$0.00/);
  assert.match(html, /Deposit status:.*refunded/);
  assert.match(html, /Refresh this panel after deposit settlement/);
  assert.deepEqual(calls, []);
});

test('communication failure shows committed enrollment, refresh does not resend, and copy failure is honest', async () => {
  render(); button('Set up deposit-first').onClick(); render(); button('Confirm enrollment').onClick();
  await options.onSuccess({ ...enrolled, communicationError: true });
  assert.match(render(), /Enrollment saved/);
  assert.match(render(), /communication.*failed/i);
  assert.doesNotMatch(render(), /Confirm enrollment|Set up deposit-first/);
  await button('Refresh status').onClick();
  assert.equal(calls.length, 1);
  assert.ok(refreshes > 0);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => { throw Error('denied'); } } } });
  await button('Copy private rental link').onClick();
  assert.match(render(), /Could not copy/);
});
test('ambiguous mutation error locks retry and asks operator to inspect status, never claims rollback', async () => {
  render(); button('Set up deposit-first').onClick(); render(); button('Confirm enrollment').onClick();
  await options.onError({ message: 'Network interrupted' });
  assert.match(render(), /Network interrupted/);
  assert.match(render(), /may already be saved/);
  assert.doesNotMatch(render(), /Confirm enrollment|Set up deposit-first/);
  await button('Refresh status').onClick();
  assert.equal(calls.length, 1);
});

test('booking details wire keyed panel, guard legacy send paths and leave create flow unenrolled', () => {
  const source = readFileSync(new URL('../src/client/pages/admin/AdminBookings.tsx', import.meta.url), 'utf8');
  assert.match(source, /<RentalCollectionPanel[\s\S]*?key=\{selectedBooking.id\}/);
  assert.match(source, /<ResendPacketButton[^>]*disabled=\{collectionLocked\}/);
  assert.match(source, /collectionLocked && \['none', 'requested'\]\.includes\(ds\)/);
  assert.match(source, /newBooking\.controls/);
  assert.match(source, /newBooking\.notice/);
  const createHandler = source.slice(source.indexOf('const newBooking ='), source.indexOf('const importBookings ='));
  assert.doesNotMatch(createHandler, /enrollRentalCollection/);
  assert.match(source, /label="Refundable security deposit"/);
});

test('reopened booking with an earlier enrollment attempt cannot submit again', () => {
  assert.match(render({}, { enrollmentAttempted: true }), /already attempted/);
  assert.doesNotMatch(render({}, { enrollmentAttempted: true }), /Set up deposit-first|Confirm enrollment/);
});

test('render is read-only; explicit confirmation is required and warns of initial email', () => {
  assert.match(render(), /Set up deposit-first rental collection/);
  assert.deepEqual(calls, []);
  button('Set up deposit-first').onClick();
  assert.match(render(), /initial customer email/);
  assert.match(render(), /direct booking.*rental is unpaid/);
  button('Cancel').onClick();
  render();
  assert.deepEqual(calls, []);
  button('Set up deposit-first').onClick(); render();
  const confirm = button('Confirm enrollment');
  confirm.onClick(); confirm.onClick();
  assert.deepEqual(calls, [{ bookingId: 42, mode: 'deposit_first', confirmDirectUnpaid: true }]);
});
