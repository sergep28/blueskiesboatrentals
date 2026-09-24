import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
mock.module('../src/db/index.ts', { namedExports: { schema, db: {
  select: () => ({ from: () => ({ where: async () => [{ state: 'claimed', refundCents: 97500, deductionCents: 2500, note: 'Fuel: $25' }] }) }),
}, pool: {} } });
mock.module('../src/server/email.ts', { namedExports: { sendWaiverPacket() {}, sendDepositSettlement() {} } });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
test('admin can read committed pending claim after an ambiguous refund without initiating another refund', async () => {
  const claim = await (bookingsRouter.createCaller({ isAdmin: true } as any) as any).depositRefundClaim({ bookingId: 1 });
  assert.deepEqual(claim, { state: 'claimed', refundAmount: 975, deductions: 25, note: 'Fuel: $25' });
});
