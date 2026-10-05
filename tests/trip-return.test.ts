import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

const booking = { bookingRef: 'BSC-RETURN-TEST' };
let startMeter: string | null = '128.70';
let existingReturns: any[] = [];
const inserted: any[] = [];
const rowsFor = (table: unknown) =>
  table === schema.bookings ? [booking]
  : table === schema.inspections ? (startMeter == null ? [] : [{ startMeterHours: startMeter }])
  : table === schema.tripReturns ? existingReturns : [];
const db = {
  select: () => ({ from: (table: unknown) => ({ where: (() => {
    const p: any = Promise.resolve(rowsFor(table));
    p.orderBy = async () => rowsFor(table);
    return p;
  }) }) }),
  insert: (table: unknown) => ({ values: async (values: any) => { inserted.push({ table, values }); } }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
const { returnsRouter, hoursUsed } = await import('../src/server/routes/returns.ts');
const client = returnsRouter.createCaller({ isAdmin: false });
const boat = Array.from({ length: 4 }, () => ({ kind: 'boat' as const, imageData: 'data:x' }));
const good = {
  bookingRef: 'bsc-return-test', endMeterHours: 134.2, newDamage: false,
  acknowledged: true as const, signaturePrinted: 'Test Renter', signatureData: 'data:sig',
  photos: [{ kind: 'meter' as const, imageData: 'data:m' }, ...boat],
};
beforeEach(() => { inserted.length = 0; startMeter = '128.70'; existingReturns = []; });

test('saves the return and reports hours used against the starting reading', async () => {
  const r = await client.submit(good);
  assert.equal(r.hoursUsed, 5.5);
  assert.equal(inserted[0].table, schema.tripReturns);
  assert.equal(inserted[0].values.bookingRef, 'BSC-RETURN-TEST');
  assert.equal(inserted[0].values.endMeterHours, '134.20');
  assert.equal(inserted[1].table, schema.returnPhotos);
  assert.equal(inserted[1].values.length, 5);
});

test('rejects an ending reading below the starting reading', async () => {
  await assert.rejects(client.submit({ ...good, endMeterHours: 120 }), /lower than the starting/);
  assert.equal(inserted.length, 0);
});

test('requires a meter photo, 4 boat photos, and notes when damage is reported', async () => {
  await assert.rejects(client.submit({ ...good, photos: boat }), /hour meter/);
  await assert.rejects(client.submit({ ...good, photos: [good.photos[0], ...boat.slice(1)] }), /at least 4/);
  await assert.rejects(client.submit({ ...good, newDamage: true }), /describe the new damage/);
  assert.equal(inserted.length, 0);
});

test('works without a starting reading (older trips) and blocks a second submission', async () => {
  startMeter = null;
  assert.equal((await client.submit(good)).hoursUsed, null);
  existingReturns = [{ id: 1 }];
  await assert.rejects(client.submit(good), /already submitted/);
});

test('hoursUsed rounds to hundredths', () => {
  assert.equal(hoursUsed('100.10', '100.30'), 0.2);
  assert.equal(hoursUsed(null, '5'), null);
});
