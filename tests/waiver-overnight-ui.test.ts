import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
let index = 0;
const state = new Map<number, any>();
const calls: any[] = [];
const trip = { bookingRef: 'BSC-SYNTHETIC', renterName: 'Test Renter', renterEmail: 'test@example.invalid',
  boatName: 'Test Boat', charterDate: '2099-01-01', isMultiDay: true, guestCount: 2, signedCount: 0,
  agreementSigned: false, idUploaded: false };
mock.module('react', { namedExports: { ...React, useEffect: () => {}, useState: (initial: any) => {
  const slot = index++;
  if (!state.has(slot)) state.set(slot, typeof initial === 'function' ? initial() : initial);
  return [state.get(slot), (next: any) => state.set(slot, typeof next === 'function' ? next(state.get(slot)) : next)];
} } });
mock.module('react-router-dom', { namedExports: {
  useParams: () => ({ ref: 'BSC-SYNTHETIC' }), useSearchParams: () => [new URLSearchParams('renter=1')],
} });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc: {
  waivers: { tripInfo: { useQuery: () => ({ data: trip, isLoading: false }) },
    create: { useMutation: () => ({ mutate: () => {}, isPending: false }) } },
  bookings: { signAgreement: { useMutation: () => ({ mutate: (input: any) => calls.push(input), isPending: false }) },
    uploadId: { useMutation: () => ({ mutate: () => {}, isPending: false }) } },
} } });
mock.module('../src/client/components/SEO.tsx', { defaultExport: () => null });
function TestSignaturePad({ onChange }: any) { return React.createElement('button', { type: 'button', onClick: () => onChange('synthetic-signature') }, 'Draw test signature'); }
mock.module('../src/client/components/SignaturePad.tsx', { defaultExport: TestSignaturePad });
const { default: WaiverPage } = await import('../src/client/pages/WaiverPage.tsx');
let tree: any;
function render() { index = 0; tree = WaiverPage(); return renderToStaticMarkup(tree); }
function nodes(n: any): any[] { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)]; }
function findTextButton(text: string) { return nodes(tree).find(n => n.type === 'button' && String(n.props.children).includes(text)); }
beforeEach(() => { state.clear(); calls.length = 0; trip.isMultiDay = true; });

test('multi-day renter paperwork asks for mandatory overnight boat address', () => {
  const html = render();
  assert.match(html, /Where will you keep the boat overnight/i);
  const field = nodes(tree).find(n => n.type === 'input' && n.props.id === 'overnightBoatAddress');
  assert.ok(field);
  assert.equal(field.props.required, true);
});

test('renter cannot sign a multi-day agreement without an address, but a supplied one is sent trimmed', () => {
  render();
  const checkbox = nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox');
  checkbox.props.onChange({ target: { checked: true } });
  render();
  const printed = nodes(tree).find(n => n.type === 'input' && n.props.placeholder === 'Type your full name');
  printed.props.onChange({ target: { value: 'Test Renter' } });
  render();
  const signature = nodes(tree).find(n => n.type === TestSignaturePad);
  assert.ok(signature);
  signature.props.onChange('synthetic-signature');
  render();
  findTextButton('Agree & Continue to ID').props.onClick();
  assert.equal(calls.length, 0);
  const field = nodes(tree).find(n => n.type === 'input' && n.props.id === 'overnightBoatAddress');
  field.props.onChange({ target: { value: '  123 Marina Way, Slip B-2  ' } });
  render();
  findTextButton('Agree & Continue to ID').props.onClick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].stayAddress, '123 Marina Way, Slip B-2');
});

test('single-day renter paperwork does not require overnight location', () => {
  trip.isMultiDay = false;
  assert.doesNotMatch(render(), /Where will you keep the boat overnight/i);
});
