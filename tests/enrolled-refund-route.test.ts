import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
let settlements = 0;
const db: any = { select: () => ({ from: () => ({ where: async () => [{ bookingId: 1 }] }) }),
  transaction: async (fn: any) => fn({ execute: async () => ({ rows: [{ id: 1 }] }), select: () => ({ from: () => ({ where: async () => [{ bookingId: 1 }] }) }) }) };
mock.module('../src/db/index.ts', { namedExports: { db, pool: {}, schema } });
mock.module('../src/server/enrolled-deposit-settlement.ts', { namedExports: {
  settleEnrolledDeposit: async (_pool: any, _stripe: any, input: any) => {
    settlements++;
    assert.deepEqual(input, { bookingId: 1, deductions: 20, deductionsNote: 'Fuel' });
    return { ok: true, refundAmount: 980, deductions: 20, newlySettled: false };
  },
} });
mock.module('../src/server/email.ts', { namedExports: { sendWaiverPacket() {}, sendDepositSettlement() { throw Error('duplicate must not send email'); } } });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
test('admin enrolled paid deposit routes to safe claim adapter, not legacy guard, and duplicate does not email', async () => {
  const result = await bookingsRouter.createCaller({ isAdmin: true } as any).settleDeposit({ bookingId: 1, deductions: 20, deductionsNote: 'Fuel' });
  assert.equal(result.refundAmount, 980);
  assert.equal(settlements, 1);
});
