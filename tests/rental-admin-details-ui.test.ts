import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const booking = { id: 42, bookingRef: 'BSC-UI-TEST', customerName: 'Test', customerEmail: 'test@example.invalid', source: 'direct', status: 'confirmed', paymentStatus: 'pending', total: 2500, subtotal: 2500, tax: 0, depositAmount: 1000, depositStatus: 'none', charterDate: '2026-12-26', duration: 'full_day', boatId: 1, guestCount: 2 };
let index = 0;
const state = new Map<number, any>();
let data: any;
let refreshing = false;
let panelProps: any;
const mutations: string[] = [];
mock.module('react', { namedExports: { ...React, useState: (initial: any) => {
  const slot = index++;
  if (!state.has(slot)) state.set(slot, typeof initial === 'function' ? initial() : initial);
  return [state.get(slot), (next: any) => state.set(slot, typeof next === 'function' ? next(state.get(slot)) : next)];
} } });
mock.module('../src/client/pages/admin/RentalCollectionPanel.tsx', { defaultExport: (props: any) => {
  panelProps = props;
  return React.createElement('div', null, 'Collection panel mounted');
} });
const trpc = new Proxy({}, { get: (_, group: string) => new Proxy({}, { get: (_, route: string) => ({
  useQuery: () => ({ isFetching: route === 'rentalCollectionStatus' && refreshing, data: route === 'rentalCollectionStatus' ? data : route === 'list' ? (group === 'bookings' ? [booking] : []) : undefined, refetch: async () => ({}) }),
  useMutation: () => ({ isPending: false, mutate: () => mutations.push(`${group}.${route}`) }),
}) }) });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc } });
const { default: AdminBookings } = await import('../src/client/pages/admin/AdminBookings.tsx');
const render = () => { index = 0; return renderToStaticMarkup(React.createElement(AdminBookings)); };
beforeEach(() => { state.clear(); state.set(2, booking); data = { enrolled: false }; refreshing = false; mutations.length = 0; });

test('cached unenrolled status locks legacy actions during background refetch until a fresh negative result', () => {
  const packetButton = (html: string) => html.match(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*Resend packet<\/button>/)?.[0] ?? assert.fail('Missing packet button');
  assert.match(render(), /Request \$1,000 Deposit Link/);
  assert.doesNotMatch(packetButton(render()), /disabled=""/);

  // The cached negative remains present during background fetching.
  refreshing = true;
  let html = render();
  assert.doesNotMatch(html, /Request \$1,000 Deposit Link|Mark Paid/);
  assert.match(packetButton(html), /disabled=""/);
  assert.match(html, /Legacy deposit requests and packet resends are paused/);

  refreshing = false;
  data = { enrolled: true };
  html = render();
  assert.doesNotMatch(html, /Request \$1,000 Deposit Link|Mark Paid/);
  assert.match(packetButton(html), /disabled=""/);

  data = { enrolled: false };
  assert.match(render(), /Request \$1,000 Deposit Link/);
  assert.doesNotMatch(packetButton(render()), /disabled=""/);
  assert.deepEqual(mutations, []);
});

test('actual details mount panel without mutations; legacy requests disappear after enrollment starts', () => {
  let html = render();
  assert.match(html, /Collection panel mounted/);
  assert.match(html, /Request \$1,000 Deposit Link/);
  assert.equal(panelProps.booking.id, 42);
  assert.deepEqual(mutations, []);
  panelProps.onEnrollmentStarted();
  html = render();
  assert.doesNotMatch(html, /Request \$1,000 Deposit Link/);
  assert.match(html, /Legacy deposit requests and packet resends are paused/);
  assert.match(html, /<button disabled=""[^>]*>[\s\S]*?Resend packet/);
  assert.deepEqual(mutations, []);
});
test('unknown and enrolled collection states suppress legacy request controls', () => {
  for (const current of [undefined, { enrolled: true }]) {
    data = current;
    assert.doesNotMatch(render(), /Request \$1,000 Deposit Link/);
    assert.deepEqual(mutations, []);
  }
});
