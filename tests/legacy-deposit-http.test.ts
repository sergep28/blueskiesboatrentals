import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import { createLegacyDepositRouter } from '../src/server/legacy-deposit-http.ts';

test('GET email link is read-only; explicit POST alone requests checkout', async () => {
  const calls = { booking: 0, enrollment: 0, checkout: 0 };
  const app = express();
  app.use('/deposit', createLegacyDepositRouter({
    loadBooking: async ref => { calls.booking++; assert.equal(ref, 'TEST-123'); return { id: 7, depositStatus: 'requested', depositAmount: 1000 }; },
    isEnrolled: async id => { calls.enrollment++; assert.equal(id, 7); return false; },
    createLink: async (id, amount) => { calls.checkout++; assert.equal(id, 7); assert.equal(amount, 1000); return 'https://example.invalid/checkout'; },
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/deposit/test-123`;
    for (let n = 0; n < 2; n++) {
      const response = await fetch(url, { redirect: 'manual' });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<form[^>]*method="post"/i);
      assert.match(html, /Continue to secure payment/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    }
    assert.deepEqual(calls, { booking: 0, enrollment: 0, checkout: 0 });
    const post = await fetch(url, { method: 'POST', redirect: 'manual' });
    assert.equal(post.status, 303);
    assert.equal(post.headers.get('location'), 'https://example.invalid/checkout');
    assert.deepEqual(calls, { booking: 1, enrollment: 1, checkout: 1 });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
