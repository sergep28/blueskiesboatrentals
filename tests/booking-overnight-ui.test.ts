import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let index = 0;
const state = new Map<number, any>();
mock.module('react', { namedExports: { ...React,
  useEffect: () => {},
  useState: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, typeof initial === 'function' ? initial() : initial);
    return [state.get(slot), (next: any) => state.set(slot, typeof next === 'function' ? next(state.get(slot)) : next)];
  },
  useRef: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, { current: initial });
    return state.get(slot);
  },
} });
mock.module('react-router-dom', { namedExports: {
  useNavigate: () => () => {},
  useSearchParams: () => [new URLSearchParams('boat=1&date=2099-01-01&duration=custom')],
  Link: ({ to, children }: any) => React.createElement('a', { href: to }, children),
} });
mock.module('../src/client/components/SEO.tsx', { defaultExport: () => null });
mock.module('react-signature-canvas', { defaultExport: () => null });
mock.module('framer-motion', { namedExports: {
  motion: { div: ({ children, className }: any) => React.createElement('div', { className }, children) },
  AnimatePresence: ({ children }: any) => children,
} });
const boat = { id: 1, name: 'Test Boat', model: 'Grady White', imageUrl: 'https://example.invalid/boat.jpg', status: 'active', homePort: 'Home marina', capacity: 8,
  priceFullDay: 500, priceHalfDay: 300, priceMultiDay: 450 };
const calls: any[] = [];
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  quotes: { getByCode: { useQuery: () => ({ data: undefined }) }, markBooked: { useMutation: () => ({ mutate: () => {} }) } },
  boats: { list: { useQuery: () => ({ data: [boat] }) } },
  partners: { validateCode: { useQuery: () => ({ data: undefined }) } },
  users: { getByEmail: { useQuery: () => ({ data: undefined }) } },
  bookings: { create: { useMutation: () => ({ isPending: false, mutate: (input: any) => calls.push(input) }) } },
} } });
Object.assign(globalThis, { window: { scrollTo: () => {}, location: { href: '' } } });
const { default: BookingPage } = await import('../src/client/pages/BookingPage.tsx');
let tree: any;
function render() { index = 0; tree = BookingPage(); return renderToStaticMarkup(tree); }
function nodes(n: any): any[] { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)]; }
function button(text: string) {
  const node = nodes(tree).find(n => n.type === 'button' && renderToStaticMarkup(n).replaceAll('&amp;', '&').includes(text));
  assert.ok(node, `Missing button ${text}`);
  return node.props;
}
function setForm(changes: Record<string, unknown>) { state.set(1, { ...state.get(1), ...changes }); render(); }
beforeEach(() => { state.clear(); calls.length = 0; });

test('a selected multi-day range shows a required overnight boat storage address field in Trip Details', () => {
  render(); setForm({ endDate: '2099-01-03' });
  const html = render();
  assert.match(html, /Where will you keep the boat overnight/i);
  assert.match(html, /required=""/);
});

test('a blank or whitespace-only address cannot advance from Trip Details', () => {
  render(); setForm({ endDate: '2099-01-03', stayAddress: ' \t ' });
  button('Continue').onClick();
  assert.equal(state.get(0), 'details');
});

test('multi-day review displays the supplied overnight location before confirmation', () => {
  render(); setForm({ endDate: '2099-01-03', stayAddress: '  123 Marina Way, Slip B-2  ' });
  button('Continue').onClick();
  setForm({ firstName: 'A', lastName: 'Renter', email: 'a@example.invalid', phone: '(305) 555-1234' });
  button('Review Booking').onClick();
  assert.match(render(), /Overnight boat location:.*123 Marina Way, Slip B-2/i);
});

test('multi-day confirmation submits the trimmed overnight address', () => {
  render(); setForm({ endDate: '2099-01-03', stayAddress: '  123 Marina Way, Slip B-2  ', signature: 'synthetic-signature', agreedToTerms: true });
  state.set(0, 'review'); render();
  button('Confirm & Proceed to Payment').onClick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].stayAddress, '123 Marina Way, Slip B-2');
});

test('review cannot submit a multi-day booking if the overnight address was cleared', () => {
  render(); setForm({ endDate: '2099-01-03', signature: 'synthetic-signature', agreedToTerms: true });
  state.set(0, 'review'); render();
  assert.equal(button('Confirm & Proceed to Payment').disabled, true);
  button('Confirm & Proceed to Payment').onClick();
  assert.equal(calls.length, 0);
});

test('legacy multi_day duration without end date still requires the overnight location', () => {
  render(); setForm({ duration: 'multi_day' });
  assert.match(render(), /Where will you keep the boat overnight/i);
  assert.equal(button('Continue').disabled, true);
  const field = nodes(tree).find(n => n.type === 'input' && n.props.id === 'stayAddress');
  assert.ok(field);
  field.props.onChange({ target: { value: 'Marina Slip 4' } });
  render();
  assert.equal(button('Continue').disabled, false);
});

test('same-day rentals do not require an overnight location', () => {
  render(); setForm({ duration: 'full_day' });
  assert.doesNotMatch(render(), /Where will you keep the boat overnight/i);
  assert.equal(button('Continue').disabled, false);
});
