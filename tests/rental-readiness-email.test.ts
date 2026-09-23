import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = 'synthetic-mocked-only';
delete process.env.STRIPE_SECRET_KEY;
const sent: any[] = [];
mock.module('resend', { namedExports: { Resend: class { emails = { send: async (payload: any) => { sent.push(payload); return { data: { id: 'synthetic' }, error: null }; } }; } } });
mock.module('../src/server/staging.ts', { namedExports: { guardResend: (r: unknown) => r } });
let enrolled = false;
mock.module('../src/db/index.ts', { namedExports: { schema, db: {
  insert: () => ({ values: async () => {} }),
  transaction: async (fn: any) => fn({
    execute: async () => ({ rows: [{ id: 1 }] }),
    select: () => ({ from: () => ({ where: async () => enrolled ? [{ bookingId: 1 }] : [] }) }),
  }),
} } });
const { sendPreTripReminder, sendWaiverPacket, sendReadinessNudge } = await import('../src/server/email.ts');
const base: any = { bookingRef: 'SYNTHETIC', customerName: 'Test', customerEmail: 'test@example.invalid', boatName: 'Test boat', charterDate: '2026-12-26', duration: 'full_day', guestCount: 1, depositAmount: 1000, agreementSigned: true, idUploaded: true, waiversSigned: 1, waiversRequired: 1, depositPaid: true, inspectionSigned: true, renterLink: 'https://example.invalid', crewLink: 'https://example.invalid', depositLink: null };
test('enrolled legacy packets and reminders reject centrally before delivery', async () => {
  enrolled = true;
  const before = sent.length;
  await assert.rejects(sendWaiverPacket(base), /enrolled/i);
  await assert.rejects(sendPreTripReminder(base), /enrolled/i);
  await assert.rejects(sendReadinessNudge({ ...base, daysOut: 1, missing: { agreement: false, id: false, waivers: false, deposit: true }, depositLink: 'https://example.invalid/legacy-deposit' }), /enrolled/i);
  assert.equal(sent.length, before);
  enrolled = false;
});
test('historical pending direct payment is not asserted unpaid in pre-trip email', async () => {
  await sendPreTripReminder({ ...base, rentalPaymentStatus: 'pending', rentalSource: 'direct' });
  const html = sent.at(-1).html;
  assert.doesNotMatch(html, /Everything is completed|You're all set/);
  assert.match(html, /Rental Payment/);
  assert.match(html, /payment not confirmed/i);
  assert.doesNotMatch(html, /unpaid|Pay Rental Balance|Rental Payment[^\n]*\$|rental payment due/i);
  assert.match(html, /Refundable Security Deposit/);
});
test('paid rental retains readiness, while OTA copy never requests direct rent', async () => {
  await sendPreTripReminder({ ...base, rentalPaymentStatus: 'paid', rentalSource: 'direct' });
  assert.match(sent.at(-1).html, /Everything is completed/);
  for (const rentalSource of ['boatsetter', 'getmyboat']) {
    for (const agreementSigned of [true, false]) {
      await sendPreTripReminder({ ...base, rentalPaymentStatus: 'pending', rentalSource, agreementSigned });
      assert.doesNotMatch(sent.at(-1).html, /Pay Rental Balance|Rental Payment.*unpaid|please contact us about your rental payment/);
      assert.match(sent.at(-1).html, /platform/i);
    }
  }
});
test('missing or nonpaid rental status never inherits paid status from the deposit', async () => {
  for (const rentalPaymentStatus of [undefined, null, 'refunded', 'failed']) {
    await sendPreTripReminder({ ...base, rentalPaymentStatus, rentalSource: 'direct' });
    assert.doesNotMatch(sent.at(-1).html, /Everything is completed|You're all set/);
    assert.match(sent.at(-1).html, /payment not confirmed/);
  }
});
test('boarding packet acknowledges explicit paid deposit even with a stale payment link', async () => {
  for (const depositLink of [null, 'https://example.invalid/stale-deposit']) {
    await sendWaiverPacket({ ...base, depositPaid: true, depositLink });
    const html = sent.at(-1).html;
    assert.match(html, /Refundable security deposit received/i);
    assert.doesNotMatch(html, /secure payment link shortly|Pay Refundable Deposit|stale-deposit|Required before boarding/);
  }
});
test('boarding packet does not infer payment from a missing deposit link', async () => {
  for (const depositPaid of [false, undefined]) {
    await sendWaiverPacket({ ...base, depositPaid, depositLink: null });
    assert.doesNotMatch(sent.at(-1).html, /Refundable security deposit received/i);
    assert.match(sent.at(-1).html, /secure payment link shortly/);
    await sendWaiverPacket({ ...base, depositPaid, depositLink: 'https://example.invalid/deposit' });
    assert.match(sent.at(-1).html, /Pay Refundable Deposit/);
  }
});
