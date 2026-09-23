import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let index = 0;
const state = new Map<number, any>();
const calls: any[] = [];
mock.module('react', { namedExports: {
  ...React,
  useMemo: (fn: () => unknown) => fn(),
  useState: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, typeof initial === 'function' ? initial() : initial);
    return [state.get(slot), (next: any) => state.set(slot, typeof next === 'function' ? next(state.get(slot)) : next)];
  },
} });
mock.module('react-router-dom', { namedExports: { useParams: () => ({ ref: 'BSC-METER-TEST' }) } });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  waivers: { tripInfo: { useQuery: () => ({ data: { bookingRef: 'BSC-METER-TEST', renterName: 'Test Renter',
    boatName: 'Test Boat', charterDate: '2099-01-01' }, isLoading: false }) } },
  inspections: { statusByBooking: { useQuery: () => ({ data: { signed: false } }) },
    submit: { useMutation: () => ({ mutate: (input: any) => calls.push(input), isPending: false }) } },
} } });
mock.module('../src/client/components/SEO.tsx', { defaultExport: () => null });
function TestSignaturePad(_props: any) { return null; }
mock.module('../src/client/components/SignaturePad.tsx', { defaultExport: TestSignaturePad });
mock.module('../src/client/components/DiagramMarker.tsx', { defaultExport: () => null });
const { default: InspectionPage } = await import('../src/client/pages/InspectionPage.tsx');
let tree: any;
function render() { index = 0; tree = InspectionPage(); return renderToStaticMarkup(tree); }
function nodes(n: any): any[] { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)]; }
function meterInput() { return nodes(tree).find(n => n.type === 'input' && n.props.id === 'startMeterHours'); }
function submit() { nodes(tree).find(n => n.type === 'button' && n.props.children === 'Submit Inspection').props.onClick(); }
beforeEach(() => { state.clear(); calls.length = 0; });

test('renter sees a required boat-hour-meter input with decimal support', () => {
  const html = render();
  assert.match(html, /Starting boat hour-meter reading/i);
  assert.ok(meterInput());
  assert.equal(meterInput().props.required, true);
  assert.equal(meterInput().props.type, 'number');
  assert.equal(meterInput().props.step, '0.01');
});

test('submit blocks an empty meter and forwards the renter-entered reading, including zero', () => {
  render();
  submit();
  assert.equal(calls.length, 0);
  assert.match(render(), /starting.*meter/i);
  meterInput().props.onChange({ target: { value: '0' } });
  render();
  const printName = nodes(tree).find(n => n.type === 'input' && n.props.placeholder === 'Full name');
  printName.props.onChange({ target: { value: 'Test Renter' } });
  render();
  const checkbox = nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox');
  checkbox.props.onChange({ target: { checked: true } });
  render();
  const signature = nodes(tree).find(n => n.type === TestSignaturePad);
  assert.ok(signature);
  signature.props.onChange('synthetic-signature');
  render();
  submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].startMeterHours, 0);
});
