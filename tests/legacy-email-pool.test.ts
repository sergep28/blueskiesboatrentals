import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
import { PgDialect } from 'drizzle-orm/pg-core';

process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = 'synthetic-no-network';
const delivered: any[] = [];
const sendOptions: any[] = [];
let providerResponse: any = { data: { id: 'fake-resend-id' }, error: null };
mock.module('resend', { namedExports: { Resend: class {
  emails = { send: async (payload: any, options: any) => {
    delivered.push(payload); sendOptions.push(options); return providerResponse;
  } };
} } });
mock.module('../src/server/staging.ts', { namedExports: { guardResend: (r: unknown) => r } });

// A single connection is enough for a booking transaction, but not for db.insert
// from inside that transaction. Bound waits so regressions fail rather than hang CI.
const rows: any[] = [];
let busy = false;
const waiting: Array<() => void> = [];
let globalInserts = 0;
const dialect = new PgDialect();
const logColumns: Record<string, string> = {
  booking_ref: 'bookingRef', customer_email: 'customerEmail',
  type: 'type', html_body: 'htmlBody', status: 'status',
};
function matchedLogs(predicate: any) {
  const { sql, params } = dialect.sqlToQuery(predicate);
  const comparisons = [...sql.matchAll(/"email_logs"\."(\w+)" = \$(\d+)/g)];
  assert.equal(comparisons.length, 5, 'the fake must enforce every idempotency criterion');
  return rows.filter(row => comparisons.every(([, column, position]) =>
    row[logColumns[column]] === params[Number(position) - 1]));
}
async function acquire(timeoutMs = 1500): Promise<() => void> {
  if (busy) await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = waiting.indexOf(grant);
      if (index !== -1) waiting.splice(index, 1);
      reject(new Error('pool(max:1) exhausted waiting for a second connection'));
    }, timeoutMs);
    const grant = () => { clearTimeout(timer); resolve(); };
    waiting.push(grant);
  });
  else busy = true;
  return () => {
    const next = waiting.shift();
    if (next) next();
    else busy = false;
  };
}
const insert = (global: boolean) => ({ values: async (row: any) => {
  if (global) {
    globalInserts++;
    const release = await acquire(40);
    try { rows.push(row); } finally { release(); }
  } else rows.push(row);
} });
const db = {
  insert: () => insert(true),
  transaction: async (fn: any) => {
    const release = await acquire();
    try {
      return await fn({
        execute: async () => ({ rows: [{ id: 1 }] }),
        select: () => ({ from: (table: unknown) => ({ where: async (predicate: any) =>
          table === schema.emailLogs ? matchedLogs(predicate) : [] }) }),
        insert: () => insert(false),
      });
    } finally { release(); }
  },
};
mock.module('../src/db/index.ts', { namedExports: { schema, db } });
const { sendWaiverPacket, sendPreTripReminder } = await import('../src/server/email.ts');
const base: any = {
  bookingRef: 'POOL', customerName: 'Synthetic Guest', customerEmail: 'guest@example.invalid',
  boatName: 'Mock Vessel', charterDate: '2099-12-26', duration: 'full_day', guestCount: 1,
  depositAmount: 1000, agreementSigned: true, idUploaded: true, waiversSigned: 1,
  waiversRequired: 1, depositPaid: true, rentalPaymentStatus: 'paid', rentalSource: 'direct',
  inspectionSigned: true, renterLink: 'https://example.invalid/renter',
  crewLink: 'https://example.invalid/crew', depositLink: null,
};
function reset() {
  rows.length = 0; delivered.length = 0; sendOptions.length = 0; globalInserts = 0;
  providerResponse = { data: { id: 'fake-resend-id' }, error: null };
}
for (const [name, sender] of [
  ['waiver packet', sendWaiverPacket], ['pre-trip reminder', sendPreTripReminder],
] as const) {
  test(`${name} logs 10 independent deliveries with a pool of one`, async () => {
    reset();
    await Promise.all(Array.from({ length: 10 }, (_, i) => sender({ ...base, bookingRef: `POOL-${i}` })));
    assert.equal(delivered.length, 10);
    assert.equal(rows.length, 10, 'every actual delivery must be logged');
    assert.ok(rows.every(r => r.status === 'sent' && r.resendId === 'fake-resend-id'));
    assert.equal(globalInserts, 0, 'no second connection while booking transaction holds the pool');
  });
  test(`${name} suppresses duplicate concurrent sends for the same booking`, async () => {
    reset();
    await Promise.all([sender(base), sender(base)]);
    assert.equal(delivered.length, 1);
    assert.equal(rows.length, 1);
  });
  test(`${name} records a provider error response as failed and permits a retry`, async () => {
    reset();
    providerResponse = { data: null, error: { message: 'synthetic rejection' } };
    await sender(base);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'failed');
    assert.match(rows[0].error, /synthetic rejection/);
    providerResponse = { data: { id: 'retry-id' }, error: null };
    await sender(base);
    assert.equal(delivered.length, 2);
    assert.equal(rows[1].status, 'sent');
  });
  test(`${name} reuses a provider idempotency key when retrying an uncertain send`, async () => {
    reset();
    providerResponse = { data: null, error: { message: 'uncertain delivery' } };
    await sender(base);
    providerResponse = { data: { id: 'retry-id' }, error: null };
    await sender(base);
    assert.match(sendOptions[0]?.idempotencyKey ?? '', /^[a-f0-9]{64}$/);
    assert.equal(sendOptions[0].idempotencyKey, sendOptions[1].idempotencyKey);
  });
}
