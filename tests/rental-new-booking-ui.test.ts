import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
let index = 0;
const state = new Map<number, any>();
mock.module('react', { namedExports: { ...React,
  useEffect: () => {},
  useState: (initial: any) => { const slot = index++; if (!state.has(slot)) state.set(slot, typeof initial === 'function' ? initial() : initial); return [state.get(slot), (v: any) => state.set(slot, typeof v === 'function' ? v(state.get(slot)) : v)]; },
  useRef: (initial: any) => { const slot = index++; if (!state.has(slot)) state.set(slot, { current: initial }); return state.get(slot); },
} });
let options: any;
const calls: any[] = [];
let saved = 0, refreshes = 0;
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) } });
const listRefreshes: string[] = [];
const bookingsApi = {
  create: { useMutation: (opts: any) => { options = opts; return { isPending: false, mutate: (v: any) => calls.push(v) }; } },
  rentalCollectionStatus: { useQuery: () => ({ refetch: async () => { refreshes++; return { data: { enrolled: true, rentalBalanceCents: 250000, depositStatus: 'requested', dueDate: '2027-01-15', messages: { initial: 'uncertain' } } }; } }) },
};
const trpc = new Proxy({}, { get: (_, group: string) => new Proxy({}, { get: (_, route: string) => group === 'bookings' && route in bookingsApi ? bookingsApi[route as keyof typeof bookingsApi] : ({
  useQuery: () => ({ data: route === 'list' ? [] : undefined, refetch: () => { listRefreshes.push(`${group}.${route}`); } }),
  useMutation: () => ({ isPending: false, mutate: () => assert.fail('Unexpected mutation') }),
}) }) });
mock.module('../src/client/lib/trpc.ts', { namedExports: { trpc } });
const { useNewBookingCreate } = await import('../src/client/pages/admin/NewBookingCreate.tsx');
const { default: AdminBookings } = await import('../src/client/pages/admin/AdminBookings.tsx');
function renderPage() { index = 0; tree = AdminBookings(); return renderToStaticMarkup(tree); }
function field(label: string, value: string) {
  const wrapper = nodes(tree).find(n => n.type === 'div' && React.Children.toArray(n.props.children).some((c: any) => c.type === 'label' && renderToStaticMarkup(c).includes(label)));
  const control = nodes(wrapper).find(n => ['input', 'select', 'textarea'].includes(n.type));
  assert.ok(control, `Missing field ${label}`); control.props.onChange({ target: { value } }); renderPage();
}
test('actual Add Booking form submits atomic payload, persists through close/reopen, shows saved notice and refreshes lists', () => {
  listRefreshes.length = 0;
  renderPage(); button('Add Booking').onClick(); renderPage();
  assert.match(renderPage(), /Use deposit-first/);
  field('Customer Name', 'Actual Renter'); field('Email *', 'actual@example.invalid'); field('Boat *', '7'); field('Date *', '2027-02-20'); field('Booked via', 'Phone');
  check('Use deposit-first'); renderPage(); check('Authorize initial email'); renderPage();
  button('Create confirmed reservation').onClick();
  assert.equal(calls.length, 1); assert.equal(calls[0].source, 'phone'); assert.equal(calls[0].boatId, 7); assert.equal(calls[0].customerName, 'Actual Renter');
  assert.equal(calls[0].skipPayment, true); assert.equal(calls[0].collectionMode, 'deposit_first');
  options.onError({ message: 'Offline' }); renderPage();
  const close = nodes(tree).find(n => n.type === 'button' && n.props['aria-label'] === 'Close new booking');
  assert.ok(close); close.props.onClick();
  assert.match(renderPage(), /Pending submission/);
  button('Add Booking').onClick(); renderPage(); assert.equal(calls.length, 1);
  options.onSuccess({ bookingId: 7, bookingRef: 'BSC-ACTUAL', collection: { communicationError: true, statusUnavailable: true, messages: { initial: 'uncertain' } } });
  const html = renderPage(); assert.match(html, /Booking saved.*BSC-ACTUAL/); assert.doesNotMatch(html, /Add Manual Booking/);
  assert.ok(listRefreshes.includes('bookings.list')); assert.ok(listRefreshes.includes('bookings.readinessList')); assert.ok(listRefreshes.includes('users.list'));
});
test('actual source selector separates manual direct from website and preserves legacy website requests', () => {
  renderPage(); button('Add Booking').onClick(); renderPage();
  assert.match(renderPage(), /Direct \(manual\)/);
  assert.match(renderPage(), /value="Website"/);
  field('Customer Name', 'Test'); field('Email *', 'test@example.invalid'); field('Boat *', '1'); field('Date *', '2027-02-20');
  check('Use deposit-first'); renderPage(); check('Authorize initial email'); renderPage(); field('Booked via', 'Website');
  assert.equal(nodes(tree).find(n => n.props?.['aria-label'] === 'Use deposit-first').props.disabled, true);
  button('Create Booking').onClick();
  assert.equal(calls[0].source, 'website'); assert.equal(calls[0].collectionMode, undefined); assert.equal(calls[0].creationRequestKey, undefined);
});
const payload = { customerName: 'Test Renter', customerEmail: 'test@example.invalid', boatId: 1, charterDate: '2027-01-20', duration: 'full_day', source: 'direct', skipPayment: true };
let tree: any;
function render(overrides = {}) { index = 0; const ui = useNewBookingCreate({ ...payload, ...overrides } as any, true, () => { saved++; }); tree = React.createElement('div', null, ui.controls, ui.notice); return renderToStaticMarkup(tree); }
function nodes(n: any): any[] { return !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)]; }
function button(text: string) { return nodes(tree).find(n => n.type === 'button' && renderToStaticMarkup(n).includes(text))?.props ?? assert.fail(`Missing ${text}`); }
function check(label: string, checked = true) { const node = nodes(tree).find(n => n.type === 'input' && n.props['aria-label'] === label); assert.ok(node, `Missing ${label}`); node.props.onChange({ target: { checked } }); }
beforeEach(() => { state.clear(); storage.clear(); calls.length = 0; saved = 0; refreshes = 0; });
test('explicit opt-in and initial-email consent sends atomic mode; unchecked remains legacy', () => {
  assert.match(render(), /refundable security deposit/i);
  assert.equal(calls.length, 0);
  button('Create Booking').onClick();
  assert.equal(JSON.stringify(calls), JSON.stringify([payload]));
  options.onSuccess({ bookingId: 1, bookingRef: 'LEGACY' });
  render(); check('Use deposit-first'); render();
  assert.equal(button('Create confirmed reservation').disabled, true);
  check('Authorize initial email'); render();
  button('Create confirmed reservation').onClick();
  assert.equal(calls[1].collectionMode, 'deposit_first');
  assert.match(calls[1].creationRequestKey, /^[0-9a-f-]{36}$/);
  assert.equal(calls[1].source, 'direct');
});
test('source changes require fresh opt-in; website/OTA/other cannot send selected mode', () => {
  optIn();
  for (const source of ['website', 'boatsetter', 'getmyboat', 'other']) {
    render({ source });
    const checkbox = nodes(tree).find(n => n.props?.['aria-label'] === 'Use deposit-first');
    assert.equal(checkbox.props.disabled, true);
    button('Create Booking').onClick();
    assert.equal(calls.at(-1).collectionMode, undefined);
    options.onSuccess({ bookingId: 1 });
  }
  for (const source of ['direct', 'phone', 'walkin']) {
    render({ source }); check('Use deposit-first'); render({ source }); check('Authorize initial email'); render({ source });
    button('Create confirmed reservation').onClick();
    assert.equal(calls.at(-1).source, source);
    assert.equal(calls.at(-1).collectionMode, 'deposit_first');
    options.onSuccess({ bookingId: 1 });
  }
});
test('confirmed saved response clears recovery and shows communication/stale-status warnings, refresh never resends', async () => {
  optIn(); button('Create confirmed reservation').onClick();
  options.onSuccess({ bookingId: 42, bookingRef: 'BSC-SAVED', total: 2500, collection: { enrolled: true, dueDate: '2027-01-15', rentalBalanceCents: 250000, depositCents: 100000, communicationError: true, statusUnavailable: true, messages: { initial: 'uncertain' }, rentalUrl: 'PRIVATE-DO-NOT-STORE', depositUrl: 'PRIVATE-DO-NOT-STORE' } });
  const html = render();
  assert.match(html, /Booking saved.*BSC-SAVED/);
  assert.match(html, /Confirmed reservation.*pending rental/i);
  assert.match(html, /communication.*manual review/i);
  assert.match(html, /last committed snapshot/i);
  assert.doesNotMatch(html, /PRIVATE-DO-NOT-STORE/);
  assert.equal(storage.size, 0); assert.equal(saved, 1);
  await button('Refresh saved collection status').onClick();
  assert.equal(refreshes, 1); assert.equal(calls.length, 1);
});
test('saved response without message snapshot still clears recovery and warns status is unknown', () => {
  optIn(); button('Create confirmed reservation').onClick();
  assert.doesNotThrow(() => options.onSuccess({ bookingId: 43, bookingRef: 'BSC-SNAPSHOT', collection: { communicationError: true, statusUnavailable: true } }));
  const html = render();
  assert.match(html, /Booking saved.*BSC-SNAPSHOT/);
  assert.match(html, /Initial email: status unknown/);
  assert.match(html, /communication.*manual review/i);
  assert.match(html, /last committed snapshot/i);
  assert.doesNotMatch(html, /Pending submission/);
  assert.equal(storage.size, 0); assert.equal(saved, 1);
  assert.equal(button('Create Booking').disabled, false);
  assert.equal(calls.length, 1);
});
test('storage failure prevents network and corrupt recovery fails closed until explicit reconciliation', () => {
  storage.set('admin.deposit-first.pending.v1', '{broken');
  assert.match(render(), /recovery.*unavailable/i);
  assert.equal(button('Create Booking').disabled, true);
  assert.equal(calls.length, 0);
  check('Reconciliation complete'); render(); button('Clear reconciled submission').onClick();
  assert.equal(storage.size, 0);
  assert.equal(buttonAfterRender().disabled, false);
  const original = sessionStorage.setItem;
  sessionStorage.setItem = () => { throw new Error('quota'); };
  try {
    optIn(); button('Create confirmed reservation').onClick();
    assert.match(render(), /not sent.*session storage/i);
    assert.equal(calls.length, 0);
  } finally { sessionStorage.setItem = original; }
});
function buttonAfterRender() { render(); return button('Create Booking'); }
test('reconciliation reset requires attestation, never clears a sending request or sends network', () => {
  optIn(); button('Create confirmed reservation').onClick();
  render(); check('Reconciliation complete'); render();
  button('Clear reconciled submission').onClick();
  assert.equal(storage.size, 1);
  options.onError({ message: 'Feature disabled' });
  render(); button('Clear reconciled submission').onClick();
  assert.equal(storage.size, 0);
  assert.equal(calls.length, 1);
  assert.doesNotMatch(render(), /Pending submission/);
});
function optIn() { render(); check('Use deposit-first'); render(); check('Authorize initial email'); render(); }
test('ambiguous retries and reload retain exact UUID/payload, never send automatically, block edited duplicate', () => {
  optIn(); const click = button('Create confirmed reservation').onClick; click(); click();
  assert.equal(calls.length, 1);
  const original = JSON.parse(JSON.stringify(calls[0]));
  assert.equal(storage.size, 1);
  options.onError({ message: 'Network interrupted' });
  assert.match(render({ customerName: 'Changed' }), /may already be saved/);
  assert.match(render({ customerName: 'Changed' }), /reconcil/i);
  button('Retry exact pending submission').onClick();
  assert.deepEqual(calls[1], original);
  options.onError({ message: 'Offline' });
  state.clear();
  assert.match(render(), /Pending submission/);
  assert.match(render(), /Test Renter/);
  assert.equal(calls.length, 2);
  assert.equal(button('Create Booking').disabled, true);
  button('Retry exact pending submission').onClick();
  assert.deepEqual(calls[2], original);
});
