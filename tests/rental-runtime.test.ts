import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ensureRentalCollections, rentalCollectionMigration } from '../src/db/ensure-rental-collections.ts';
process.env.NODE_ENV = 'test';
delete process.env.RENTAL_COLLECTION_REMINDERS_ENABLED;
// If the disabled worker tries touching a DB, this fails instead of connecting anywhere.
mock.module('../src/db/index.ts', { namedExports: { pool: { query: () => { throw new Error('No DB permitted'); } } } });
const { sendPendingRentalReminders } = await import('../src/server/rental-runtime.ts');
test('rental reminder runtime is disabled by default and does not open a database', async () => {
 assert.deepEqual(await sendPendingRentalReminders(), { scanned: 0 });
});
test('actual startup migration is additive, with ledger constraints and zero historical enrollments', async () => {
 const statements: string[] = [];
 await ensureRentalCollections({ query: async (sql: string) => { statements.push(sql); } } as any);
 assert.deepEqual(statements, [rentalCollectionMigration]);
 assert.doesNotMatch(rentalCollectionMigration, /\b(?:INSERT|UPDATE|DELETE|DROP)\b/i);
 assert.match(rentalCollectionMigration, /session_id text PRIMARY KEY/);
 assert.match(rentalCollectionMigration, /intent_id text UNIQUE/);
 assert.match(rentalCollectionMigration, /UNIQUE \(booking_id, type\)/);
});
