import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRentalRouter } from '../src/server/rental-http.ts';
import { RentalFlow } from '../src/server/rental-flow.ts';
test('token GET is non-collecting; POST uses verified capability and blocks paid/OTA/cancelled', async () => {
 const token = 'a'.repeat(64); let checkoutCalls = 0;
 const state: any = { booking: { id: 1, bookingRef: 'SYNTHETIC', source: 'direct', status: 'confirmed', paymentStatus: 'pending', depositStatus: 'paid', depositAmount: 1000, total: 500, charterDate: '2099-12-26', customerEmail: 'test@example.invalid' }, plan: null };
 const locked: any = async (key: any, fn: any) => { if (key !== 1 && key !== token) throw new Error('not found'); return fn(state); };
 const flow = new RentalFlow({ locked, now: () => new Date('2099-12-01'), token: () => token, appUrl: 'https://example.invalid', send: async () => {}, checkout: async () => { checkoutCalls++; return { id: 'cs_1', url: 'https://checkout.stripe.com/test', status: 'open' }; }, retrieve: async id => ({ id, url: 'https://checkout.stripe.com/test', status: 'open' }) });
 await flow.authorize(1, 'deposit_first', true);
 const app = express(); app.use('/rental', createRentalRouter(flow, locked));
 const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
 const address = server.address() as any; const root = `http://127.0.0.1:${address.port}/rental/`;
 try {
   const get = await fetch(root + token); assert.equal(get.status, 200); assert.match(await get.text(), /500.00/); assert.equal(checkoutCalls, 0);
   const post = await fetch(root + token, { method: 'POST', redirect: 'manual' }); assert.equal(post.status, 303); assert.equal(checkoutCalls, 1);
   assert.equal((await fetch(root + 'b'.repeat(64), { method: 'POST' })).status, 409);
   for (const patch of [{ paymentStatus: 'paid' }, { source: 'boatsetter' }, { status: 'cancelled' }]) {
     Object.assign(state.booking, { paymentStatus: 'pending', source: 'direct', status: 'confirmed' }, patch);
     assert.equal((await fetch(root + token, { method: 'POST', redirect: 'manual' })).status, 409);
   }
   assert.equal(checkoutCalls, 1);
 } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});
