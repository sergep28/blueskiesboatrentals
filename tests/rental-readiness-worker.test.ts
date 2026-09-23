import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
delete process.env.STRIPE_SECRET_KEY;
const calls: any[] = [];
const booking = { id: 1, bookingRef: 'SYNTHETIC', source: 'direct', paymentStatus: 'pending', status: 'confirmed', customerEmail: 'test@example.invalid', charterDate: '2026-12-26', depositStatus: 'paid', agreedToTerms: true, idUploadedAt: 'synthetic', guestCount: 1 };
mock.module('stripe', { defaultExport: class { constructor() { throw new Error('Must not initialize Stripe'); } } });
mock.module('../src/server/deposits.ts', { namedExports: { depositPayUrl: () => { throw new Error('Paid deposit must not be requested'); } } });
mock.module('../src/server/email.ts', { namedExports: { sendPreTripReminder: async (data: any) => { calls.push(data); } } });
mock.module('../src/db/index.ts', { namedExports: { schema, db: {
  select: () => ({ from: (table: unknown) => ({ where: async () => table === schema.bookings ? [booking] : table === schema.boats ? [{ name: 'Synthetic' }] : table === schema.waivers ? [{}] : [] }) }),
  update: () => ({ set: () => ({ where: async () => {} }) }),
} } });
const { sendPendingPreTripReminders } = await import('../src/server/pre-trip-reminders.ts');
test('actual reminder worker passes independent rental status and authoritative source to email', async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-25T12:00:00Z') });
  try {
    await sendPendingPreTripReminders();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].rentalPaymentStatus, 'pending');
    assert.equal(calls[0].rentalSource, 'direct');
  } finally { mock.timers.reset(); }
});
