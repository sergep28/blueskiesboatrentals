import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
process.env.NODE_ENV = 'test';
delete process.env.STRIPE_SECRET_KEY;
mock.module('../src/db/index.ts', { namedExports: { db: {}, schema } });
mock.module('../src/server/email.ts', { namedExports: { sendWaiverPacket() {}, sendDepositSettlement() {} } });
mock.module('../src/server/deposits.ts', { namedExports: { createDepositLink() {}, depositPayUrl() {} } });
const { bookingsRouter } = await import('../src/server/routes/bookings.ts');
test('existing-booking enrollment is an admin-only strict mutation', async () => {
  assert.ok(bookingsRouter._def.procedures.enrollRentalCollection, 'missing admin opt-in endpoint');
  const caller = bookingsRouter.createCaller({ isAdmin: false }) as any;
  await assert.rejects(caller.enrollRentalCollection({ bookingId: 1, confirmDirectUnpaid: true, mode: 'deposit_first' }), /Admin/);
  const admin = bookingsRouter.createCaller({ isAdmin: true }) as any;
  await assert.rejects(admin.enrollRentalCollection({ bookingId: 1, confirmDirectUnpaid: false, mode: 'deposit_first' }));
});
