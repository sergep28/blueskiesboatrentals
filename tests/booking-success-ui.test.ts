import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let booking: any;
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  bookings: { getByRef: { useQuery: () => ({ data: booking }) } },
  waivers: { byBooking: { useQuery: () => ({ data: [] }) } },
  users: { createProfile: { useMutation: () => ({ mutate: () => {} }) } },
} } });
mock.module('../src/client/components/SEO.tsx', { defaultExport: () => null });
mock.module('react-router-dom', { namedExports: {
  useParams: () => ({ ref: 'BSC-TEST' }),
  Link: ({ to, children }: any) => createElement('a', { href: to }, children),
} });
mock.module('framer-motion', { namedExports: { motion: { div: ({ children, className }: any) => createElement('div', { className }, children) } } });
mock.module('canvas-confetti', { defaultExport: () => { throw new Error('No celebration during SSR'); } });
mock.module('qrcode', { defaultExport: { toDataURL: () => Promise.resolve('') } });
Object.assign(globalThis, { window: { location: { origin: 'https://example.invalid' } } });
const { default: BookingSuccessPage } = await import('../src/client/pages/BookingSuccessPage.tsx');
const fixture = { bookingRef: 'BSC-TEST', charterDate: '2099-01-01', duration: 'full_day', total: 500, loyaltyPointsEarned: 500 };

for (const status of ['pending', 'refunded', 'partially_refunded', undefined]) {
  test(`stored ${status ?? 'loading'} state makes no paid/earned/processing claims`, () => {
    booking = status ? { ...fixture, paymentStatus: status } : undefined;
    const html = renderToStaticMarkup(createElement(BookingSuccessPage));
    assert.doesNotMatch(html, /Total Paid|Points Earned|You just earned|Claim your|Your points are waiting|Claim Points|Payment Processing|being processed|Booking Confirmed!/);
    if (status === 'pending') assert.match(html, /Payment not confirmed/);
  });
}
test('stored paid state retains paid total and earned points', () => {
  booking = { ...fixture, paymentStatus: 'paid', status: 'confirmed' };
  const html = renderToStaticMarkup(createElement(BookingSuccessPage));
  assert.match(html, /Total Paid/);
  assert.match(html, /Points Earned/);
  assert.match(html, /Booking Confirmed!/);
});
for (const source of ['boatsetter', 'getmyboat']) {
  test(`${source} pending internal status does not request a second rental payment`, () => {
    booking = { ...fixture, source, status: 'confirmed', paymentStatus: 'pending' };
    const html = renderToStaticMarkup(createElement(BookingSuccessPage));
    assert.match(html, /Booking recorded/i);
    assert.match(html, /booking platform|Boatsetter|GetMyBoat/i);
    assert.doesNotMatch(html, /Payment not confirmed|arrange payment|Total Paid|Points Earned|You just earned/i);
  });
}
