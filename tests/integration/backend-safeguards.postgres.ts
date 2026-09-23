import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema.ts';
import type pg from 'pg';
import type { RentalFlow } from '../../src/server/rental-flow.ts';

// DB module substitution is dependency wiring ONLY: real Drizzle, real pool, real
// transactions and SQL. No query/text mocks. External Stripe/email alone are fakes.
export async function checkBackendSafeguards(ctx: {
  db: pg.Pool; flow: RentalFlow; seed(id: number): Promise<void>;
  snapshot(id: number): Promise<any>; sent: any[];
  check(name: string, fn: () => Promise<void>): Promise<void>;
}) {
  const { db, flow, seed, snapshot, sent, check } = ctx;
  assert.equal(process.env.DATABASE_URL, undefined, 'run using env -i, never app env');
  const calls = { checkout: 0, refund: 0, email: 0 };
  const sessions = new Map<string, any>();
  let create: (params: any, opts: any) => Promise<any> = async (_, opts) => ({
    id: `cs_${opts.idempotencyKey}`, url: `https://example.invalid/${opts.idempotencyKey}`,
  });
  const dbModule = mock.module('../../src/db/index.ts', { namedExports: { db: drizzle(db, { schema }), pool: db, schema } });
  const stripeModule = mock.module('stripe', { defaultExport: class {
    checkout = { sessions: {
      create: async (params: any, opts: any) => {
        calls.checkout++; const session = await create(params, opts);
        sessions.set(session.id, { ...session, status: 'open' });
        return session;
      },
      retrieve: async (id: string) => {
        const session = sessions.get(id);
        if (!session) throw new Error('Synthetic provider session unknown');
        return session;
      },
    } };
    refunds = { create: async () => { calls.refund++; return { id: 're_synthetic' }; } };
  } });
  const boundary = { send: async (_message: any, _options: any): Promise<any> => ({ data: { id: 'synthetic-email' } }) };
  const emailModule = mock.module('resend', { namedExports: { Resend: class {
    emails = { send: async (message: any, options: any) => { calls.email++; return boundary.send(message, options); } };
  } } });
  process.env.RESEND_API_KEY = 'synthetic-not-a-real-key';
  process.env.STRIPE_SECRET_KEY = 'synthetic-not-a-real-key';
  const { createDepositLink } = await import('../../src/server/deposits.ts');
  const { settleLegacyCheckout } = await import('../../src/server/legacy-payment-settlement.ts');
  const { bookingsRouter } = await import('../../src/server/routes/bookings.ts');
  const caller = bookingsRouter.createCaller({ isAdmin: true } as any);
  const attempts = async (id: number) => (await db.query('SELECT * FROM rental_checkout_attempts WHERE key=$1', [`legacy-deposit-${id}`])).rows;
  const completeSnapshot = async (id: number) => ({ ...await snapshot(id), attempts: await attempts(id) });
  const capture = (fn: () => Promise<any>) => fn().then(value => ({ ok: true, value }), error => ({ ok: false, error }));
  async function waitFor(fn: () => Promise<boolean>, label: string) {
    for (let i = 0; i < 250; i++) {
      if (await fn()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error(`Timed out observing ${label}`);
  }
  // Queue two REAL entrypoints behind a third connection's row lock. Observe
  // pg_blocking_pids, not elapsed time, before releasing either contender.
  async function race(id: number, first: () => Promise<any>, second: () => Promise<any>) {
    const blocker = await db.connect();
    const pending: Promise<any>[] = [];
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM bookings WHERE id=$1 FOR UPDATE', [id]);
      const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      pending.push(capture(first));
      const waiting = async () => (await db.query(`SELECT pid, pg_blocking_pids(pid) blockers FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>$1`, [pid])).rows;
      await waitFor(async () => (await waiting()).some(r => r.blockers.includes(pid)), 'first contender blocked');
      pending.push(capture(second));
      await waitFor(async () => (await waiting()).length >= 2, 'both real contenders blocked');
      console.log(`LOCK PROOF booking=${id} blocker=${pid} waiters=${JSON.stringify(await waiting())}`);
      await blocker.query('COMMIT');
      return await Promise.all(pending);
    } finally {
      await blocker.query('ROLLBACK'); blocker.release(); await Promise.all(pending);
    }
  }
  const rejected = (result: any, pattern: RegExp) => { assert.equal(result.ok, false); assert.match(String(result.error), pattern); };
  try {
    await check('central legacy deposit wins real row-lock race: enrollment rejects committed attempt', async () => {
      await seed(101);
      const before = { ...calls }, messages = sent.length;
      const result = await race(101, () => createDepositLink(101), () => flow.authorize(101, 'deposit_first', true));
      assert.equal(result[0].ok, true); rejected(result[1], /legacy.*attempt|existing checkout/i);
      assert.equal((await attempts(101)).length, 1);
      assert.equal((await snapshot(101)).plans.length, 0);
      assert.equal(calls.checkout - before.checkout, 1); assert.equal(sent.length, messages);
    });
    await check('enrollment wins real row-lock race: central legacy deposit rejects before provider', async () => {
      await seed(102);
      const before = { ...calls };
      const result = await race(102, () => flow.authorize(102, 'deposit_first', true), () => createDepositLink(102));
      assert.equal(result[0].ok, true); rejected(result[1], /enrolled/i);
      assert.equal((await snapshot(102)).plans.length, 1); assert.equal((await attempts(102)).length, 0);
      assert.deepEqual(calls, before); assert.equal(sent.filter(m => m.key === 'rental-102-initial').length, 1);
    });
    await check('permanent legacy deposit link resumes an open checkout on its second click', async () => {
      await seed(109);
      const first = await createDepositLink(109);
      const providerCalls = calls.checkout;
      const second = await createDepositLink(109);
      assert.equal(second.checkoutUrl, first.checkoutUrl);
      assert.equal(calls.checkout, providerCalls, 'open session must not create another charge');
      assert.equal((await attempts(109)).length, 1, 'enrollment barrier remains durable');
      assert.equal((await snapshot(109)).booking[0].deposit_status, 'requested');
      assert.equal((await snapshot(109)).booking[0].deposit_payment_intent_id, null);
    });
    await check('verified expired session gets one new generation; concurrent clicks reuse its checkout', async () => {
      await seed(110);
      const first = await createDepositLink(110);
      const previousId = (await snapshot(110)).booking[0].deposit_stripe_session_id;
      sessions.set(previousId, { id: previousId, status: 'expired', payment_status: 'unpaid', url: null });
      const count = calls.checkout;
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => createDepositLink(110)));
      for (const result of results) { if (result.status === 'rejected') throw result.reason; }
      const links = results.map(result => (result as PromiseFulfilledResult<any>).value.checkoutUrl);
      assert.equal(new Set(links).size, 1);
      assert.notEqual(links[0], first.checkoutUrl);
      assert.equal(calls.checkout - count, 1);
      assert.equal((await db.query("SELECT count(*)::int n FROM rental_checkout_attempts WHERE key LIKE 'legacy-deposit-110%' ")).rows[0].n, 2);
      assert.equal((await snapshot(110)).booking[0].deposit_payment_intent_id, null);
      await assert.rejects(flow.authorize(110, 'deposit_first', true), /legacy.*attempt/i);
    });
    await check('even an expired provider session with paid evidence cannot rotate to another charge', async () => {
      await seed(111);
      await createDepositLink(111);
      const id = (await snapshot(111)).booking[0].deposit_stripe_session_id;
      sessions.set(id, { id, status: 'expired', payment_status: 'paid', url: null });
      const count = calls.checkout;
      await assert.rejects(createDepositLink(111), /awaiting verification/i);
      assert.equal(calls.checkout, count);
      assert.equal((await attempts(111)).length, 1);
      assert.equal((await snapshot(111)).booking[0].deposit_status, 'requested');
    });
    await check('unknown provider state and changed checkout terms fail closed without a fresh charge', async () => {
      await seed(112);
      await createDepositLink(112);
      const id = (await snapshot(112)).booking[0].deposit_stripe_session_id;
      const saved = sessions.get(id);
      const count = calls.checkout;
      sessions.delete(id);
      await assert.rejects(createDepositLink(112), /provider session unknown/);
      assert.equal(calls.checkout, count);
      sessions.set(id, { ...saved, status: 'complete', payment_status: 'paid' });
      await assert.rejects(createDepositLink(112), /awaiting verification/);
      sessions.set(id, saved);
      await db.query('UPDATE bookings SET deposit_amount=42 WHERE id=112');
      await assert.rejects(createDepositLink(112), /details changed/);
      assert.equal(calls.checkout, count);
      assert.equal((await attempts(112)).length, 1);
    });
    await check('an ambiguous attempt past provider idempotency retention never retries or appears paid', async () => {
      await seed(113);
      const normalCreate = create;
      create = async () => { throw new Error('synthetic lost provider response'); };
      try { await assert.rejects(createDepositLink(113), /lost provider response/); }
      finally { create = normalCreate; }
      await db.query("UPDATE rental_checkout_attempts SET created_at=(CURRENT_TIMESTAMP - interval '24 hours')::text WHERE key='legacy-deposit-113'");
      const count = calls.checkout;
      await assert.rejects(createDepositLink(113), /manual reconciliation/);
      await assert.rejects(flow.authorize(113, 'deposit_first', true), /legacy.*attempt/i);
      assert.equal(calls.checkout, count);
      assert.equal((await snapshot(113)).booking[0].deposit_status, 'requested');
      assert.equal((await snapshot(113)).booking[0].deposit_payment_intent_id, null);
    });
    await check('verified deposit settlement prevents any further checkout attempt', async () => {
      await seed(114);
      await createDepositLink(114);
      const id = (await snapshot(114)).booking[0].deposit_stripe_session_id;
      const count = calls.checkout;
      await settleLegacyCheckout('SYNTHETIC-114', { id, payment_intent: 'pi_114',
        amount_total: 100000, currency: 'usd', payment_status: 'paid' }, 'evt_114', true);
      await assert.rejects(createDepositLink(114), /already settled/);
      assert.equal(calls.checkout, count);
      assert.equal((await snapshot(114)).booking[0].deposit_payment_intent_id, 'pi_114');
    });
    await check('provider timeout retains committed barrier; same-key retry recovers without a second charge', async () => {
      await seed(103);
      const before = await snapshot(103), counts = { ...calls }, messages = sent.length;
      const normalCreate = create;
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      let entered = false, attemptsAtProvider = 0;
      create = async (params, opts) => {
        assert.equal(opts.idempotencyKey, 'legacy-deposit-103'); assert.equal(opts.timeout, 15000);
        attemptsAtProvider++;
        if (attemptsAtProvider === 1) {
          entered = true; await gate;
          // The provider accepted the request but its response was lost.
          sessions.set('cs_legacy-deposit-103', { id: 'cs_legacy-deposit-103', url: 'https://example.invalid/checkout', status: 'open' });
          throw new Error('synthetic provider timeout after request accepted');
        }
        return sessions.get('cs_legacy-deposit-103') ?? normalCreate(params, opts);
      };
      const pending = capture(() => createDepositLink(103));
      try {
        await waitFor(async () => entered, 'provider boundary');
        assert.equal((await attempts(103)).length, 1, 'committed while provider is unresolved');
        assert.deepEqual(await snapshot(103), before, 'no false paid/requested status before response');
      } finally { release(); }
      rejected(await pending, /provider timeout/);
      try {
        await assert.rejects(flow.authorize(103, 'deposit_first', true), /legacy.*attempt/i);
        const retry = await createDepositLink(103);
        assert.equal(retry.checkoutUrl, 'https://example.invalid/checkout');
        assert.equal(attemptsAtProvider, 2);
        assert.equal((await attempts(103)).length, 1);
        assert.equal((await snapshot(103)).booking[0].deposit_status, 'requested');
        assert.equal((await snapshot(103)).booking[0].deposit_payment_intent_id, null);
        assert.equal(calls.checkout - counts.checkout, 2);
        assert.equal(sent.length, messages);
      } finally { create = normalCreate; }
    });
    await check('12 concurrent legacy rental webhook settlements commit exactly one aggregate/referral effect', async () => {
      await seed(104); await db.query("UPDATE bookings SET stripe_session_id='cs_legacy_104' WHERE id=104");
      const event = { id: 'cs_legacy_104', payment_intent: 'pi_legacy_104', amount_total: 50000, currency: 'usd', payment_status: 'paid' };
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => settleLegacyCheckout('SYNTHETIC-104', event, `evt_${i}`, false)));
      assert.equal(results.filter(r => !r.duplicate).length, 1); assert.equal(results.filter(r => r.duplicate).length, 11);
      const s = await snapshot(104);
      assert.equal(s.booking[0].payment_status, 'paid'); assert.equal(s.booking[0].stripe_payment_id, event.payment_intent);
      assert.equal(s.user[0].booking_count, 1); assert.equal(s.user[0].total_spent, 500); assert.equal(s.user[0].loyalty_points, 5);
      assert.equal(s.referral.length, 1); assert.equal(s.referral[0].commission, 50);
      assert.equal(s.plans.length, 0); assert.equal(s.ledger.length, 0);
      await assert.rejects(settleLegacyCheckout('SYNTHETIC-104', { ...event, payment_intent: 'pi_conflict' }, 'evt_conflict', false), /conflicting/i);
      assert.deepEqual(await snapshot(104), s);
    });
    await check('12 concurrent legacy deposit webhook settlements commit one receipt without rental aggregates', async () => {
      await seed(105); await db.query("UPDATE bookings SET deposit_stripe_session_id='cs_legacy_105' WHERE id=105");
      const event = { id: 'cs_legacy_105', payment_intent: 'pi_legacy_105', amount_total: 100000, currency: 'usd', payment_status: 'paid' };
      const before = await snapshot(105);
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => settleLegacyCheckout('SYNTHETIC-105', event, `evt_deposit_${i}`, true)));
      assert.equal(results.filter(r => !r.duplicate).length, 1);
      const s = await snapshot(105); assert.equal(s.booking[0].deposit_status, 'paid'); assert.equal(s.booking[0].payment_status, 'pending');
      assert.deepEqual(s.user, before.user); assert.deepEqual(s.referral, []); assert.deepEqual(s.ledger, []);
      assert.equal((await settleLegacyCheckout('SYNTHETIC-105', event, 'evt_replay', true)).duplicate, true);
      assert.deepEqual(await snapshot(105), s);
    });
    await check('legacy invalid payment evidence leaves every financial table untouched', async () => {
      await seed(107); await db.query("UPDATE bookings SET stripe_session_id='cs_legacy_107' WHERE id=107");
      const event = { id: 'cs_legacy_107', payment_intent: 'pi_legacy_107', amount_total: 50000, currency: 'usd', payment_status: 'paid' };
      const before = await completeSnapshot(107);
      for (const invalid of [{ amount_total: 1 }, { currency: 'eur' }, { payment_status: 'unpaid' }, { id: 'cs_wrong' }, { payment_intent: null }]) {
        await assert.rejects(settleLegacyCheckout('SYNTHETIC-107', { ...event, ...invalid }, 'evt_invalid', false), /evidence/i);
        assert.deepEqual(await completeSnapshot(107), before);
      }
    });
    await check('late legacy referral constraint failure rolls back booking and aggregate effects', async () => {
      await seed(108); await db.query("UPDATE bookings SET stripe_session_id='cs_legacy_108' WHERE id=108");
      const event = { id: 'cs_legacy_108', payment_intent: 'pi_legacy_108', amount_total: 50000, currency: 'usd', payment_status: 'paid' };
      const before = await completeSnapshot(108);
      // Real PostgreSQL failure AFTER the source has updated booking and user.
      await db.query('ALTER TABLE referral_transactions ADD CONSTRAINT synthetic_rollback CHECK (booking_id <> 108)');
      try {
        await assert.rejects(settleLegacyCheckout('SYNTHETIC-108', event, 'evt_rollback', false), (e: any) => (e.cause?.code ?? e.code) === '23514');
        assert.deepEqual(await completeSnapshot(108), before);
      } finally { await db.query('ALTER TABLE referral_transactions DROP CONSTRAINT synthetic_rollback'); }
      assert.equal((await settleLegacyCheckout('SYNTHETIC-108', event, 'evt_recovered', false)).duplicate, false);
      const after = await snapshot(108);
      assert.equal(after.user[0].booking_count, 1); assert.equal(after.referral.length, 1);
    });
    await seed(106); await flow.authorize(106, 'deposit_first', true);
    // Make refund otherwise eligible, so the test cannot pass just because the
    // ordinary 'deposit must be paid' guard happened to reject it.
    await db.query("UPDATE bookings SET deposit_status='paid', deposit_payment_intent_id='pi_refundable' WHERE id=106");
    const mutations: [string, () => Promise<any>][] = [
      ['status cancellation', () => caller.updateStatus({ id: 106, status: 'cancelled' })],
      ['update cancellation', () => caller.update({ id: 106, status: 'cancelled' })],
      ['manual rental payment', () => caller.update({ id: 106, paymentStatus: 'paid' })],
      ['manual deposit payment', () => caller.markDepositPaid({ bookingId: 106, amount: 50 })],
      ['gross total snapshot', () => caller.update({ id: 106, total: 42, customerName: 'MUST ROLLBACK' })],
      ['subtotal snapshot', () => caller.update({ id: 106, subtotal: 42 })],
      ['email snapshot', () => caller.update({ id: 106, customerEmail: 'changed@example.invalid' })],
      ['start date snapshot', () => caller.update({ id: 106, charterDate: '2099-12-27' })],
      ['end date snapshot', () => caller.update({ id: 106, endDate: null })],
      ['boat snapshot', () => caller.update({ id: 106, boatId: 2 })],
      ['provider refund', () => caller.settleDeposit({ bookingId: 106, deductions: 0 })],
      ['legacy webhook settlement', () => settleLegacyCheckout('SYNTHETIC-106', { id: 'cs_other', payment_intent: 'pi_other', amount_total: 50000, currency: 'usd', payment_status: 'paid' }, 'evt_other', false)],
    ];
    for (const [name, operation] of mutations) await check(`enrolled ${name} rejects atomically with zero provider/email calls`, async () => {
      const before = await completeSnapshot(106), counts = { ...calls }, messages = sent.length;
      await assert.rejects(operation(), /enrolled/i);
      assert.deepEqual(await completeSnapshot(106), before); assert.deepEqual(calls, counts); assert.equal(sent.length, messages);
    });
    const { checkAtomicNewBooking } = await import('./atomic-new-booking.postgres.ts');
    await checkAtomicNewBooking({ db, caller, boundary, calls, check });
  } finally {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    emailModule.restore(); stripeModule.restore(); dbModule.restore();
  }
}
