import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '../src/db/schema.ts';
test('collection opt-in is a separate keyed table, never a default enrollment on bookings', () => {
  const table = (schema as any).rentalCollections;
  assert.ok(table, 'missing durable collection schema');
  assert.ok(table.bookingId);
  assert.ok(table.token);
  assert.ok(table.state);
  assert.equal((schema.bookings as any).rentalToken, undefined);
});
