import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dynamic namespace lets the RED phase report a missing behavior, not an import error.
const policy = await import('../src/server/rental-policy.ts').catch(() => ({})) as any;
test('Eastern calendar deadline is five days before departure and due now on due-day/short notice', () => {
  assert.equal(typeof policy.rentalDeadline, 'function');
  assert.deepEqual(policy.rentalDeadline('2026-11-03', new Date('2026-10-20T12:00:00Z')), { dueDate: '2026-10-29', dueNow: false });
  assert.deepEqual(policy.rentalDeadline('2027-01-02', new Date('2026-12-29T02:00:00Z')), { dueDate: '2026-12-28', dueNow: true });
  assert.deepEqual(policy.rentalDeadline('2026-03-10', new Date('2026-03-09T02:00:00Z')), { dueDate: '2026-03-08', dueNow: true });
});
