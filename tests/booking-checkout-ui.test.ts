import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// SSR harness retains hook state between renders so the real mutation callback
// and resulting page can be exercised without a browser or API requests.
let index = 0;
const state = new Map<number, any>();
mock.module('react', { namedExports: { ...React, useState: (initial: any) => {
  const slot = index++;
  const [value] = React.useState(state.has(slot) ? state.get(slot) : initial);
  return [value, (next: any) => state.set(slot, typeof next === 'function' ? next(value) : next)];
} } });
let onSuccess: (data: any) => void;
const navigations: string[] = [];
const bookedQuotes: string[] = [];
mock.module('react-router-dom', { namedExports: {
  useNavigate: () => (url: string) => navigations.push(url),
  useSearchParams: () => [new URLSearchParams('quote=TEST')],
  Link: ({ to, children }: any) => React.createElement('a', { href: to }, children),
} });
mock.module('../src/client/components/SEO.tsx', { defaultExport: () => null });
mock.module('react-signature-canvas', { defaultExport: () => null });
mock.module('framer-motion', { namedExports: {
  motion: { div: ({ children, className }: any) => React.createElement('div', { className }, children) },
  AnimatePresence: ({ children }: any) => children,
} });
const query = { useQuery: () => ({ data: undefined }) };
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  quotes: { getByCode: query, markBooked: { useMutation: () => ({ mutate: (code: string) => bookedQuotes.push(code) }) } },
  boats: { list: query }, partners: { validateCode: query }, users: { getByEmail: query },
  bookings: { create: { useMutation: (options: any) => { onSuccess = options.onSuccess; return {}; } } },
} } });
Object.assign(globalThis, { window: { location: { href: '' } } });
const { default: BookingPage } = await import('../src/client/pages/BookingPage.tsx');
const render = () => { index = 0; return renderToStaticMarkup(React.createElement(BookingPage)); };
beforeEach(() => { state.clear(); navigations.length = 0; bookedQuotes.length = 0; window.location.href = ''; });
for (const checkoutUnavailable of [true, undefined]) {
  test(`no checkout (${checkoutUnavailable}) stays on page with unpaid notice/reference, not success`, () => {
    render();
    onSuccess({ bookingRef: 'BSC-UNPAID', checkoutUrl: null, checkoutUnavailable });
    assert.deepEqual(navigations, []);
    assert.deepEqual(bookedQuotes, []);
    const html = render();
    assert.match(html, /Checkout unavailable/);
    assert.match(html, /No payment has been collected/);
    assert.match(html, /BSC-UNPAID/);
    assert.doesNotMatch(html, /Confirm &amp; Proceed to Payment|Booking Confirmed/);
  });
}
test('available checkout redirects to the provided checkout URL', () => {
  render();
  onSuccess({ bookingRef: 'BSC-TEST', checkoutUrl: 'https://checkout.example.invalid/session' });
  assert.equal(window.location.href, 'https://checkout.example.invalid/session');
  assert.deepEqual(navigations, []);
  assert.deepEqual(bookedQuotes, ['TEST']);
});
