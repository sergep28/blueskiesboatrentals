import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const inspection = {
  bookingRef: 'BSC-METER-TEST', signedAt: '2099-01-01T08:00:00', startMeterHours: '128.70',
  checklist: '[]', signaturePrinted: 'Test Renter', acknowledged: true,
};
const booking = { bookingRef: 'BSC-METER-TEST', customerName: 'Test Renter', charterDate: '2099-01-01', status: 'confirmed' };
let slot = 0;
mock.module('react', { namedExports: { ...React,
  useMemo: (fn: () => unknown) => fn(),
  useState: (initial: any) => [slot++ === 0 ? 'BSC-METER-TEST' : initial, () => {}],
} });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  bookings: { list: { useQuery: () => ({ data: [booking] }) } },
  inspections: { adminList: { useQuery: () => ({ data: [inspection] }) },
    adminByBooking: { useQuery: () => ({ data: { inspection, photos: [] } }) } },
} } });
const { default: AdminInspections } = await import('../src/client/pages/admin/AdminInspections.tsx');
const { renderInspection } = await import('../src/client/lib/bookingPdfs.ts');

test('admin inspection detail shows the actual starting meter reading, not a payment or estimate', () => {
  slot = 0;
  assert.match(renderToStaticMarkup(AdminInspections()), /Starting boat hour-meter reading.*128\.70/s);
});

test('legacy admin inspection with no reading is visibly unknown, never zero', () => {
  inspection.startMeterHours = null as any;
  slot = 0;
  const html = renderToStaticMarkup(AdminInspections());
  assert.match(html, /Starting boat hour-meter reading.*Not recorded/s);
  inspection.startMeterHours = '128.70';
});

test('signed inspection PDF preserves the starting reading; old PDFs state not recorded', () => {
  const pdf = renderInspection(inspection, [], booking).output();
  assert.match(pdf, /Starting boat hour-meter reading/);
  assert.match(pdf, /128\.70/);
  const old = renderInspection({ ...inspection, startMeterHours: null }, [], booking).output();
  assert.match(old, /Not recorded/);
  assert.doesNotMatch(old, /NaN/);
});
