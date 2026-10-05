import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

const booking = { bookingRef: 'BSC-METER-TEST' };
const inserted: any[] = [];
const db = {
  select: () => ({ from: () => ({ where: async () => [booking] }) }),
  insert: (table: unknown) => ({ values: async (values: any) => { inserted.push({ table, values }); } }),
};
mock.module('../src/db/index.ts', { namedExports: { db, schema } });
const { inspectionsRouter } = await import('../src/server/routes/inspections.ts');
const client = inspectionsRouter.createCaller({ isAdmin: false });
const submission = {
  bookingRef: 'BSC-METER-TEST', checklist: [], acknowledged: true,
  signaturePrinted: 'Test Renter', photos: [],
};
beforeEach(() => { inserted.length = 0; });

test('pre-departure inspection requires a numeric starting boat meter reading before any write', async () => {
  await assert.rejects(client.submit(submission as any));
  await assert.rejects(client.submit({ ...submission, startMeterHours: -1 } as any));
  await assert.rejects(client.submit({ ...submission, startMeterHours: 1.234 } as any));
  assert.equal(inserted.length, 0);
});

test('pre-departure inspection saves the renter-entered start reading, including zero', async () => {
  await client.submit({ ...submission, startMeterHours: 0 } as any);
  assert.equal(inserted[0].table, schema.inspections);
  assert.equal(inserted[0].values.startMeterHours, '0.00');
  inserted.length = 0;
  await client.submit({ ...submission, startMeterHours: 128.7 } as any);
  assert.equal(inserted[0].values.startMeterHours, '128.70');
});
