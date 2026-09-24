import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';

const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const charterDate = new Date(Date.parse(`${dateParts}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const booking: any = { id: 17, bookingRef: 'SYNTHETIC-ENROLLED', charterDate, status: 'confirmed', customerEmail: 'test@example.invalid', customerName: 'Test Renter', customerPhone: null, boatId: 1, guestCount: 2, depositAmount: 1000, depositStatus: 'requested', agreedToTerms: false, idUploadedAt: null, userId: null, readinessNudgeStage: null };
let sends = 0;
let stamps = 0;
let alerts = 0;
mock.module('../src/db/index.ts', { namedExports: { schema, db: {
  select: () => ({ from: (table: unknown) => ({ where: async () => {
    if (table === schema.bookings) return [booking];
    if (table === schema.rentalCollections) return [{ bookingId: booking.id }];
    if (table === schema.waivers) return [];
    if (table === schema.boats) return [{ name: 'Test boat' }];
    return [];
  } }) }),
  update: () => ({ set: () => ({ where: async () => { stamps++; } }) }),
} } });
mock.module('../src/server/email.ts', { namedExports: {
  sendReadinessNudge: async () => { sends++; },
  sendReadinessAlert: async () => { alerts++; },
} });
mock.module('../src/server/deposits.ts', { namedExports: { depositPayUrl: () => 'https://example.invalid/deposit' } });
const { sendPendingReadinessNudges } = await import('../src/server/readiness-nudges.ts');

test('enrolled booking gets no legacy readiness link, sender call, or sent milestone', async () => {
  const result = await sendPendingReadinessNudges();
  assert.equal(result.sent, 0);
  assert.equal(sends, 0);
  assert.equal(stamps, 0);
  assert.equal(alerts, 0);
});
