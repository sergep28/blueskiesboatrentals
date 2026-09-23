import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ensureRentalCollections } from '../../src/db/ensure-rental-collections.ts';

// Invoked inside the existing real-Drizzle/PG wiring. Only provider constructors
// are substituted; router, runtime, flow, store and transactions are unmodified.
export async function checkAtomicNewBooking({ db, caller, boundary, calls, check }: {
  db: pg.Pool; caller: any; calls: { checkout: number; refund: number; email: number };
  boundary: { send: (message: any, options: any) => Promise<any> };
  check: (name: string, fn: () => Promise<void>) => Promise<void>;
}) {
  process.env.RENTAL_COLLECTION_ENROLLMENT_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'synthetic-not-a-real-key';
  process.env.APP_URL = 'https://example.invalid';
  process.env.FROM_EMAIL = 'test@example.invalid';
  // Older fixtures use explicit IDs. Bring sequences forward before actual inserts.
  for (const table of ['users', 'bookings']) await db.query(`SELECT setval(pg_get_serial_sequence('${table}','id'), (SELECT max(id) FROM ${table}))`);
  await db.query(`INSERT INTO boats(id,name,model,type,length_ft,capacity,price_half_day,price_full_day)
    VALUES (1,'Synthetic','Synthetic','center_console',20,6,250,500)`);
  const input = () => ({ boatId: 1, customerName: 'Synthetic Atomic', customerEmail: `${randomUUID()}@example.invalid`,
    charterDate: '2099-12-26', duration: 'full_day', charterType: 'cruising', guestCount: 2,
    collectionMode: 'deposit_first', creationRequestKey: randomUUID() });
  const tables = ['users', 'bookings', 'rental_collections', 'rental_creation_requests', 'rental_payments', 'rental_checkout_attempts', 'referral_transactions'];
  const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async t => [t, (await db.query(`SELECT * FROM ${t} ORDER BY 1`)).rows])));
  const state = async (key: string) => {
    const { rows } = await db.query(`SELECT r.*, b.customer_email,b.user_id,b.status,b.payment_status,b.deposit_status,b.stripe_session_id,b.total,
      c.state,u.booking_count,u.total_spent,u.loyalty_points FROM rental_creation_requests r
      JOIN bookings b ON b.id=r.booking_id JOIN users u ON u.id=b.user_id JOIN rental_collections c ON c.booking_id=b.id WHERE r.request_key=$1`, [key]);
    assert.equal(rows.length, 1); return { ...rows[0], plan: JSON.parse(rows[0].state) };
  };
  const messages: any[] = [];
  const proofs: any[] = [];
  let uncertain = false;
  let activeKey = '';
  boundary.send = async (message, options) => {
    messages.push({ message, options });
    // This independent pooled connection cannot see uncommitted inserts from the
    // store transaction. Failures are retained outside runtime's swallowed send errors.
    try {
      const saved = await state(activeKey);
      assert.equal(saved.plan.messages.initial, 'sending');
      assert.equal(options.idempotencyKey, `rental-${saved.booking_id}-initial`);
      assert.equal(saved.customer_email, message.to);
      assert.equal(saved.status, 'confirmed'); assert.equal(saved.payment_status, 'pending');
      assert.equal(saved.deposit_status, 'requested'); assert.equal(saved.stripe_session_id, null);
      assert.equal(saved.booking_count, 0); assert.equal(saved.total_spent, 0); assert.equal(saved.loyalty_points, 0);
      assert.match(message.text, /\/waiver\/.*\?renter=1/); assert.match(message.text, /Crew waivers:/);
      assert.match(message.text, /https:\/\/example.invalid\/rental\//);
      proofs.push({ ok: true });
    } catch (error) { proofs.push({ ok: false, error }); throw error; }
    if (uncertain) throw new Error('synthetic provider accepted request but response lost');
    return { data: { id: `synthetic-${messages.length}` }, error: null };
  };
  const assertProofs = () => { for (const p of proofs) if (!p.ok) throw p.error; };
  const providersBefore = { ...calls };
  try {
    await check('NEW atomic migration twice preserves existing data and creates empty request table', async () => {
      const before = await snapshot();
      await ensureRentalCollections(db); await ensureRentalCollections(db);
      assert.deepEqual(await snapshot(), before); assert.equal(before.rental_creation_requests.length, 0);
      const constraints = (await db.query(`SELECT contype FROM pg_constraint WHERE conrelid='rental_creation_requests'::regclass`)).rows.map(r => r.contype).sort();
      assert.deepEqual(constraints, ['f', 'p', 'u']);
    });
    await check('NEW 8 concurrent identical UUID tRPC creates commit one user/booking/plan/request and one initial email', async () => {
      const request = input(); activeKey = request.creationRequestKey;
      const before = await snapshot(), count = messages.length;
      const blocker = await db.connect(); const pending: Promise<any>[] = [];
      let results: any[] = [];
      try {
        await blocker.query('BEGIN');
        await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`rental-create:${activeKey}`]);
        const pid = (await blocker.query('SELECT pg_backend_pid() pid')).rows[0].pid;
        for (let i = 0; i < 8; i++) pending.push(caller.create(request).then((value: any) => ({ value }), (error: any) => ({ error })));
        let waiters: any[] = [];
        for (let i = 0; i < 250; i++) {
          waiters = (await db.query(`SELECT pid,pg_blocking_pids(pid) blockers FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND pid<>$1`, [pid])).rows;
          if (waiters.length === 8) break;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        assert.equal(waiters.length, 8, 'all eight real transactions must wait on the same advisory lock');
        assert.ok(waiters.every(w => w.blockers.includes(pid)), 'all contenders must be blocked by our same-key advisory lock');
        console.log(`NEW LOCK PROOF ${JSON.stringify(waiters)}`);
        assert.deepEqual(await snapshot(), before); assert.equal(messages.length, count);
        await blocker.query('COMMIT'); results = await Promise.all(pending);
      } finally { await blocker.query('ROLLBACK'); blocker.release(); await Promise.all(pending); }
      for (const r of results) if (r.error) throw r.error;
      assert.equal(new Set(results.map(r => r.value.bookingId)).size, 1);
      assert.equal(new Set(results.map(r => r.value.bookingRef)).size, 1);
      const saved = await state(activeKey), after = await snapshot();
      for (const t of tables) assert.equal(after[t].length - before[t].length, ['users','bookings','rental_collections','rental_creation_requests'].includes(t) ? 1 : 0, t);
      assert.equal(saved.plan.messages.initial, 'sent'); assert.equal(messages.length - count, 1); assertProofs();
      const retry = await caller.create(request);
      assert.equal(retry.bookingId, saved.booking_id); assert.equal(retry.collection.communicationError, false);
      assert.equal(retry.collection.rentalTotalCents, 53750); assert.equal(retry.collection.depositCents, 100000);
      assert.equal(retry.checkoutUrl, null); assert.equal(messages.length - count, 1);
      const committed = await snapshot();
      await assert.rejects(caller.create({ ...request, guestCount: 3 }), /request.*different/i);
      assert.deepEqual(await snapshot(), committed); assert.equal(messages.length - count, 1);
    });
    await check('NEW late PostgreSQL plan constraint rolls back user/booking/request and sends nothing; same UUID recovers', async () => {
      const request = input(); activeKey = request.creationRequestKey;
      const before = await snapshot(), count = messages.length;
      await db.query(`ALTER TABLE rental_collections ADD CONSTRAINT synthetic_atomic_failure CHECK (state::jsonb->>'snapshot' NOT LIKE '%${request.customerEmail}%')`);
      try {
        await assert.rejects(caller.create(request), (error: any) => {
          let e = error; while (e && e.code !== '23514') e = e.cause;
          return e?.constraint === 'synthetic_atomic_failure';
        });
        assert.deepEqual(await snapshot(), before); assert.equal(messages.length, count);
      } finally { await db.query('ALTER TABLE rental_collections DROP CONSTRAINT synthetic_atomic_failure'); }
      const recovered = await caller.create(request);
      assert.equal(recovered.collection.communicationError, false);
      assert.equal((await state(activeKey)).booking_id, recovered.bookingId);
      assert.equal(messages.length - count, 1); assertProofs();
    });
    await check('NEW uncertain Resend response preserves committed booking; identical UUID retry never sends twice', async () => {
      const request = input(); activeKey = request.creationRequestKey;
      const count = messages.length; uncertain = true;
      const first = await caller.create(request); uncertain = false;
      assert.equal(first.collection.communicationError, true); assert.equal(first.collection.messages.initial, 'uncertain');
      const before = await snapshot();
      const retries = await Promise.all(Array.from({ length: 8 }, () => caller.create(request)));
      for (const retry of retries) {
        assert.equal(retry.bookingId, first.bookingId); assert.equal(retry.bookingRef, first.bookingRef);
        assert.equal(retry.collection.communicationError, true); assert.equal(retry.collection.messages.initial, 'uncertain');
      }
      assert.deepEqual(await snapshot(), before); assert.equal(messages.length - count, 1); assertProofs();
    });
    await check('NEW provider boundary independently observes committed records before every initial send; no Stripe calls', async () => {
      assert.ok(proofs.length >= 3); assertProofs();
      assert.equal(calls.checkout, providersBefore.checkout); assert.equal(calls.refund, providersBefore.refund);
      assert.equal(calls.email - providersBefore.email, messages.length);
    });
  } finally {
    for (const key of ['RENTAL_COLLECTION_ENROLLMENT_ENABLED', 'RESEND_API_KEY', 'APP_URL', 'FROM_EMAIL']) delete process.env[key];
  }
}
