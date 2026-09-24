import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.RESEND_API_KEY = 'synthetic-no-network';
const logs: any[] = [];
mock.module('resend', { namedExports: { Resend: class {
  emails = { send: async () => ({ data: null, error: { message: 'synthetic rejection' } }) };
} } });
mock.module('../src/db/index.ts', { namedExports: { schema, db: { insert: () => ({ values: async (row: any) => { logs.push(row); } }) } } });
const { sendDepositSettlement } = await import('../src/server/email.ts');

test('provider error response cannot be recorded as a delivered settlement email', async () => {
  await sendDepositSettlement({ bookingRef: 'SAMPLE-NO-BOOKING', customerName: 'Sample Guest',
    customerEmail: 'guest@example.invalid', boatName: 'Sample Boat', charterDate: '2099-12-26',
    depositAmount: 1000, deductions: 0, refundAmount: 1000 });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].status, 'failed');
  assert.equal(logs[0].type, 'deposit_settlement');
});
