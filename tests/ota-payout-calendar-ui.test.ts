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
    return [state.get(slot), (value: any) => state.set(slot, typeof value === 'function' ? value(state.get(slot)) : value)];
  },
  useRef: (initial: any) => {
    const slot = index++;
    if (!state.has(slot)) state.set(slot, { current: initial });
    return state.get(slot);
  },
} });
const requests: any[] = [];
const trpc = new Proxy({}, { get: () => new Proxy({}, { get: (_, route: string) => ({
  useQuery: () => ({ data: route === 'list' ? [] : undefined, refetch: () => {} }),
  useMutation: () => ({ isPending: false, mutate: (value: any) => requests.push({ route, value }) }),
}) }) });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc } });
const { default: AdminBookings } = await import('../src/client/pages/admin/AdminBookings.tsx');
let tree: any;
function render() { index = 0; tree = AdminBookings(); return renderToStaticMarkup(tree); }
function nodes(node: any): any[] {
  return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes)
    : [node, ...nodes(node.props?.children)];
}
function button(text: string): any {
  return nodes(tree).find(n => n.type === 'button' && renderToStaticMarkup(n).includes(text))?.props
    ?? assert.fail(`Missing button ${text}`);
}
function field(label: string, value: string): any {
  const wrapper = nodes(tree).find(n => n.type === 'div' && React.Children.toArray(n.props.children)
    .some((c: any) => c.type === 'label' && renderToStaticMarkup(c).includes(label)));
  const control = nodes(wrapper).find(n => ['input', 'select', 'textarea'].includes(n.type));
  assert.ok(control, `Missing field ${label}`);
  control.props.onChange({ target: { value } });
  render();
  return control;
}
beforeEach(() => { state.clear(); requests.length = 0; });

for (const [platform, source] of [['Boatsetter', 'boatsetter'], ['GetMyBoat', 'getmyboat']] as const) {
  test(`${platform} selection shows YOUR PAYOUT, no website tax, and requires a positive payout`, () => {
    render(); button('Add Booking').onClick(); render();
    field('Customer Name', 'Synthetic renter');
    field('Email *', 'synthetic@example.invalid');
    field('Boat *', '1');
    field('Date *', '2099-10-05');
    assert.equal(button('Create Booking').disabled, false, 'direct booking may use the standard rate');
    field('Booked via', platform);
    const html = render();
    assert.match(html, new RegExp(`YOUR PAYOUT.*${platform}`));
    assert.match(html, /expected amount from platform/);
    assert.doesNotMatch(html, /Negotiated Price/);
    assert.match(html, /No additional website rent or tax/);
    assert.match(html, /triggers the agreement\/waiver packet and separate \$1,000 deposit request/);
    assert.doesNotMatch(html, /then send the client their agreement/);
    assert.equal(button('Create Booking').disabled, true);
    const payout = field('YOUR PAYOUT', '0');
    assert.equal(payout.props.type, 'number');
    assert.equal(payout.props.required, true);
    assert.equal(button('Create Booking').disabled, true);
    field('YOUR PAYOUT', '0.001');
    assert.equal(button('Create Booking').disabled, true, 'sub-cent payout cannot round to $0.00');
    field('YOUR PAYOUT', '0.011');
    assert.equal(button('Create Booking').disabled, true, 'payout must use whole cents');
    field('YOUR PAYOUT', '3761.25');
    assert.equal(button('Create Booking').disabled, false);
    button('Create Booking').onClick();
    assert.equal(requests.at(-1).route, 'create');
    assert.equal(requests.at(-1).value.source, source);
    assert.equal(requests.at(-1).value.customPrice, 3761.25);
    assert.equal(requests.at(-1).value.skipPayment, true);
  });
}

test('switching from direct price to OTA clears the amount instead of reusing it as payout', () => {
  render(); button('Add Booking').onClick(); render();
  field('Customer Name', 'Synthetic renter');
  field('Email *', 'synthetic@example.invalid');
  field('Boat *', '1');
  field('Date *', '2099-10-05');
  field('Negotiated Price', '700');
  field('Booked via', 'Boatsetter');
  const wrapper = nodes(tree).find(n => n.type === 'div' && React.Children.toArray(n.props.children)
    .some((c: any) => c.type === 'label' && renderToStaticMarkup(c).includes('YOUR PAYOUT')));
  const input = nodes(wrapper).find(n => n.type === 'input');
  assert.equal(input?.props.value, '');
  assert.equal(button('Create Booking').disabled, true);
});
