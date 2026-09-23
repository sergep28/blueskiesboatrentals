import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as flow from '../src/server/rental-flow.ts';

test('owner preview exercises real formatter with synthetic reference and disabled links', async () => {
  const sample = (flow as any).sampleCollectionEmail;
  assert.equal(typeof sample, 'function');
  const initial = await sample('initial');
  assert.match(initial.text, /Refundable security deposit: \$1000\.00/);
  assert.match(initial.text, /Rental balance due: \$537\.50/);
  assert.match(initial.text, /Pay refundable security deposit: https:\/\/example\.invalid\/rental\/sample-no-real-payment\/deposit/);
  assert.doesNotMatch(initial.text, /Pay Rental Balance:/);
  const depositReceipt = await sample('deposit_receipt');
  assert.match(depositReceipt.text, /Deposit received: \$1000\.00/);
  assert.match(depositReceipt.text, /Deadline: \d{4}-\d{2}-\d{2} \(America\/New_York\)/);
  assert.match(depositReceipt.text, /Pay Rental Balance: https:\/\/example\.invalid\/rental\/sample-no-real-payment/);
  const reminder = await sample('reminder');
  assert.match(reminder.text, /Rental balance due: \$537\.50/);
  assert.match(reminder.text, /Deadline: \d{4}-\d{2}-\d{2} \(America\/New_York\)/);
  const rentReceipt = await sample('rental_receipt');
  assert.match(rentReceipt.text, /Rental payment received/);
  assert.match(rentReceipt.text, /Rental balance due: \$0\.00/);
  for (const message of [initial, depositReceipt, rentReceipt]) {
    assert.doesNotMatch(message.text, /https:\/\/www\.blueskiesboatrentals\.com/);
    assert.match(message.subject, /SAMPLE/);
  }
});
