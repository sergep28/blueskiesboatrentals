import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

process.env.RESEND_API_KEY = 'synthetic-owner-preview-only';
const sends: any[] = [];
mock.module('resend', { namedExports: { Resend: class {
  emails = { send: async (payload: any) => { sends.push(payload); return { data: { id: 'synthetic-preview' }, error: null }; } };
} } });
mock.module('../src/db/index.ts', { namedExports: { db: {}, schema } });
mock.module('../src/server/email.ts', { namedExports: { getEmailStatus: () => ({}), sendTestEmail: () => ({ ok: true }) } });
const { systemRouter } = await import('../src/server/routes/system.ts');

test('owner-only sample route requires admin and cannot accept a recipient', async () => {
  const guest = systemRouter.createCaller({ isAdmin: false } as any);
  await assert.rejects(guest.sendCollectionPreview({ kind: 'initial' }), /Admin/i);
  const admin = systemRouter.createCaller({ isAdmin: true } as any);
  await assert.rejects(admin.sendCollectionPreview({ kind: 'initial', to: 'renter@example.invalid' } as any));
  assert.equal(sends.length, 0);
  const initial = await admin.sendCollectionPreview({ kind: 'initial' });
  assert.equal(initial.ok, true);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].to, 'info@blueskiescharter.com');
  assert.match(sends[0].subject, /SAMPLE/);
  assert.match(sends[0].text, /SAMPLE ONLY.*no real booking/);
  assert.match(sends[0].text, /example\.invalid\/rental\/sample-no-real-payment\/deposit/);
  assert.doesNotMatch(sends[0].text, /Pay Rental Balance:/);
  await admin.sendCollectionPreview({ kind: 'deposit_receipt' });
  assert.equal(sends[1].to, 'info@blueskiescharter.com');
  assert.match(sends[1].text, /Deposit received: \$1000\.00/);
  assert.match(sends[1].text, /Pay Rental Balance:/);
  await admin.sendCollectionPreview({ kind: 'rental_receipt' });
  await admin.sendCollectionPreview({ kind: 'reminder' });
  assert.equal(sends.length, 4);
  for (const message of sends) {
    assert.equal(message.to, 'info@blueskiescharter.com');
    assert.match(message.subject, /SAMPLE/);
    assert.doesNotMatch(message.text, /https:\/\/www\.blueskiesboatrentals\.com/);
  }
});
