// Run: env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp node --experimental-test-module-mocks --import tsx tests/integration/rental-postgres.disposable.ts
// No app bootstrap, dotenv, DATABASE_URL, real Stripe client, or email client is loaded.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';
import { bookings, users, partners, referralTransactions, boats } from '../../src/db/schema.ts';
import { ensureRentalCollections } from '../../src/db/ensure-rental-collections.ts';
import { createRentalStore } from '../../src/server/rental-store.ts';
import { RentalFlow } from '../../src/server/rental-flow.ts';
import { createRentalCheckout } from '../../src/server/rental-checkout.ts';

// Fail before starting a cluster if invoked with application/provider environment.
for (const key of ['DATABASE_URL', 'PGHOST', 'PGSERVICE', 'STRIPE_SECRET_KEY', 'RENTAL_COLLECTION_ENROLLMENT_ENABLED']) {
  assert.equal(process.env[key], undefined, `${key} must be absent; use the documented env -i command`);
}
const bin = '/opt/homebrew/opt/postgresql@16/bin';
const root = mkdtempSync('/tmp/rental-pg-');
const data = `${root}/data`, socket = `${root}/socket`;
mkdirSync(socket);
// Unix socket directory is fresh and private; TCP is completely disabled.
const childEnv = { PATH: '/usr/bin:/bin:/opt/homebrew/bin', HOME: root, LC_ALL: 'C' };
const command = (name: string, args: string[]) => {
  console.log(`$ ${bin}/${name} ${args.join(' ')}`);
  return execFileSync(`${bin}/${name}`, args, { env: childEnv, encoding: 'utf8' });
};
let started = false;
let pool: pg.Pool | undefined, attempts: pg.Pool | undefined;
let failures = 0, passed = 0;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failures++; console.error(`FAIL ${name}`, e); }
}
try {
  console.log(command('initdb', ['-D', data, '-U', 'rental_test', '--auth=trust', '--no-locale', '--encoding=UTF8']));
  console.log(command('pg_ctl', ['-D', data, '-l', `${root}/postgres.log`, '-o', `-k ${socket} -p 55439 -c listen_addresses='' -c fsync=off`, '-w', 'start']));
  started = true;
  const options = { host: socket, port: 55439, user: 'rental_test', password: '', database: 'postgres', ssl: false as const, max: 16, connectionTimeoutMillis: 5000, statement_timeout: 10000, application_name: 'rental_disposable_verification' };
  pool = new pg.Pool(options); attempts = new pg.Pool({ ...options, max: 4 });
  const db = pool;
  const identity = (await db.query('SELECT version(), current_database(), current_user, inet_server_addr(), current_setting(\'data_directory\') AS data_directory')).rows[0];
  assert.equal(identity.data_directory, data); assert.equal(identity.inet_server_addr, null);
  console.log('ISOLATION', JSON.stringify(identity));
  // Derive base table column types/defaults from the actual Drizzle schema, not hand-made mocks.
  const dialect = new PgDialect();
  for (const table of [users, bookings, partners, referralTransactions, boats]) {
    const cfg = getTableConfig(table);
    const columns = cfg.columns.map(c => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}${c.isUnique ? ' UNIQUE' : ''}${c.default === undefined ? '' : ' DEFAULT ' + (typeof c.default === 'object' ? dialect.sqlToQuery(c.default as any).sql : typeof c.default === 'string' ? "'" + c.default.replaceAll("'", "''") + "'" : String(c.default))}`);
    await db.query(`CREATE TABLE "${cfg.name}" (${columns.join(',')})`);
  }
  async function seed(id: number) {
    await db.query('INSERT INTO users(id) VALUES ($1)', [id]);
    await db.query(`INSERT INTO bookings(id,booking_ref,boat_id,user_id,customer_name,customer_email,charter_date,end_date,duration,charter_type,guest_count,subtotal,tax,total,status,deposit_status,referral_code,referral_discount,loyalty_points_earned)
      VALUES ($1,$2,1,$1,'Synthetic Test','test@example.invalid','2099-12-26','2099-12-28','multi_day','cruising',2,500,0,500,'confirmed','requested','SYNTHETIC_REF',25,5)`, [id, `SYNTHETIC-${id}`]);
  }
  await db.query(`INSERT INTO partners(id,business_name,contact_name,email,type,referral_code) VALUES (1,'Synthetic','Synthetic','test@example.invalid','other','SYNTHETIC_REF')`);
  await seed(1);
  await check('actual additive migration twice leaves historical booking untouched and unenrolled', async () => {
    const before = (await db.query('SELECT * FROM bookings ORDER BY id')).rows;
    await ensureRentalCollections(db); await ensureRentalCollections(db);
    assert.deepEqual((await db.query('SELECT * FROM bookings ORDER BY id')).rows, before);
    for (const t of ['rental_collections', 'rental_payments', 'rental_checkout_attempts', 'rental_creation_requests']) assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n, 0);
  });
  const store = createRentalStore(db);
  let providerCalls = 0;
  const sent: any[] = [];
  // Only external boundaries are fakes. All SQL, transactions, locks, migration, flow and reservation code are real.
  const checkout = createRentalCheckout(attempts, { checkout: { sessions: { create: async (_: any, opts: any) => {
    providerCalls++;
    return { id: `cs_${opts.idempotencyKey}`, url: `https://example.invalid/${opts.idempotencyKey}`, status: 'open' };
  } } } } as any, 'https://example.invalid');
  const flow = new RentalFlow({ ...store, token: randomUUID, now: () => new Date('2099-12-01T12:00:00Z'), appUrl: 'https://example.invalid', checkout, retrieve: async id => ({ id, url: `https://example.invalid/${id.replace(/^cs_/, '')}`, status: 'open' }), send: async m => { sent.push(m); } });
  const plan = async (id: number) => JSON.parse((await db.query('SELECT state FROM rental_collections WHERE booking_id=$1', [id])).rows[0].state);
  const evidence = (id: number) => ({ id: `cs_collection-${id}-rental_balance-0`, payment_status: 'paid', currency: 'usd', amount_total: 50000, payment_intent: `pi_${id}` });
  async function snapshot(id: number) {
    return { booking: (await db.query('SELECT * FROM bookings WHERE id=$1', [id])).rows, user: (await db.query('SELECT * FROM users WHERE id=$1', [id])).rows, plans: (await db.query('SELECT * FROM rental_collections WHERE booking_id=$1', [id])).rows, ledger: (await db.query('SELECT * FROM rental_payments WHERE booking_id=$1', [id])).rows, referral: (await db.query('SELECT * FROM referral_transactions WHERE booking_id=$1', [id])).rows };
  }
  await check('concurrent first enrollment yields one plan, one initial message and no historical backfill', async () => {
    await seed(2);
    await Promise.all(Array.from({ length: 8 }, () => flow.authorize(2, 'deposit_first', true)));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM rental_collections')).rows[0].n, 1);
    assert.equal(sent.filter(m => m.key === 'rental-2-initial').length, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM rental_collections WHERE booking_id=1')).rows[0].n, 0);
  });
  await check('booking ID and token routes block on same real PostgreSQL row lock', async () => {
    const blocker = await db.connect(); let completed = false; let pending: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN'); await blocker.query('SELECT id FROM bookings WHERE id=2 FOR UPDATE');
      const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      pending = store.locked((await plan(2)).token, async () => { completed = true; });
      let observed = false;
      for (let i = 0; i < 100; i++) {
        const r = await db.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))', [pid]);
        if (r.rows[0].n > 0) { observed = true; break; }
        await sleep(20);
      }
      assert.equal(observed, true, 'a real backend must be waiting on blocker'); assert.equal(completed, false);
      await blocker.query('COMMIT'); await pending; assert.equal(completed, true);
    } finally { await blocker.query('ROLLBACK'); blocker.release(); await pending; }
  });
  await check('12 concurrent checkout requests create one committed attempt and one provider call', async () => {
    const before = providerCalls;
    const token = (await plan(2)).token;
    const urls = await Promise.all(Array.from({ length: 12 }, (_, i) => flow.checkout(i % 2 ? 2 : token, 'rental_balance')));
    assert.equal(new Set(urls).size, 1); assert.equal(providerCalls - before, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM rental_checkout_attempts WHERE key=$1', ['collection-2-rental_balance-0'])).rows[0].n, 1);
  });
  await check('invalid payment evidence rolls back without booking, state, ledger or financial changes', async () => {
    const before = await snapshot(2);
    for (const invalid of [{ amount_total: 1 }, { currency: 'eur' }, { payment_status: 'unpaid' }, { id: 'cs_wrong' }, { payment_intent: null }]) {
      await assert.rejects(flow.paid(2, { ...evidence(2), ...invalid }, 'rental_balance'), /evidence/);
      assert.deepEqual(await snapshot(2), before);
    }
  });
  await check('12 concurrent duplicate settlements have exactly one financial effect', async () => {
    const before = await snapshot(2);
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => flow.paid(2, evidence(2), 'rental_balance')));
    const rejected = results.filter(r => r.status === 'rejected');
    if (rejected.length === results.length) {
      assert.deepEqual(await snapshot(2), before);
      console.log('VERIFIED: all failed referral settlements rolled back every financial/state write');
    }
    if (rejected.length) throw (rejected[0] as PromiseRejectedResult).reason;
    const s = await snapshot(2);
    assert.equal(s.ledger.length, 1); assert.equal(s.booking[0].payment_status, 'paid'); assert.equal(s.booking[0].deposit_status, 'requested');
    assert.equal(s.user[0].booking_count, 1); assert.equal(s.user[0].total_spent, 500); assert.equal(s.user[0].loyalty_points, 5);
    assert.equal(s.referral.length, 1); assert.equal(s.referral[0].amount, 500); assert.equal(s.referral[0].commission, 50);
    assert.equal((await plan(2)).rentalPaid, true); assert.equal(sent.filter(m => m.key === 'rental-2-rental_receipt').length, 1);
  });
  await check('12 duplicate settlements without referral commit one ledger and one user increment', async () => {
    await seed(4); await db.query('UPDATE bookings SET referral_discount=0 WHERE id=4');
    await flow.authorize(4, 'deposit_first', true); await flow.checkout(4, 'rental_balance');
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => flow.paid(4, evidence(4), 'rental_balance')));
    for (const r of results) if (r.status === 'rejected') throw r.reason;
    const s = await snapshot(4);
    assert.equal(s.ledger.length, 1); assert.equal(s.booking[0].payment_status, 'paid');
    assert.equal(s.user[0].booking_count, 1); assert.equal(s.user[0].total_spent, 500); assert.equal(s.user[0].loyalty_points, 5);
    assert.equal(s.referral.length, 0); assert.equal((await plan(4)).rentalPaid, true);
    assert.equal(sent.filter(m => m.key === 'rental-4-rental_receipt').length, 1);
  });
  await check('late plan constraint failure rolls back prior ledger, booking and user writes', async () => {
    await seed(3); await db.query('UPDATE bookings SET referral_discount=0 WHERE id=3'); const before = await snapshot(3);
    await assert.rejects(store.locked(3, async s => {
      s.plan = { ...await plan(2), token: (await plan(2)).token };
      s.payment = { type: 'rental_balance', sessionId: 'cs_rollback', intentId: 'pi_rollback' };
    }), (e: any) => e.code === '23505');
    assert.deepEqual(await snapshot(3), before);
  });
  await check('separate checkout reservation survives outer rollback and rejects old ambiguous retry', async () => {
    await flow.authorize(3, 'deposit_first', true);
    const key = 'collection-3-rental_balance-0';
    await assert.rejects(store.locked(3, async s => {
      await checkout({ cents: 50000, type: 'rental_balance', booking: s.booking, idempotencyKey: key });
      throw new Error('synthetic crash before booking commit');
    }), /synthetic crash/);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM rental_checkout_attempts WHERE key=$1', [key])).rows[0].n, 1);
    assert.equal((await plan(3)).rentalSession, undefined);
    await db.query("UPDATE rental_checkout_attempts SET created_at=(CURRENT_TIMESTAMP - interval '24 hours')::text WHERE key=$1", [key]);
    const calls = providerCalls;
    await assert.rejects(flow.checkout(3, 'rental_balance'), /manual review/); assert.equal(providerCalls, calls);
  });
  await check('database constraints independently reject duplicate session, intent, booking/type and invalid type', async () => {
    await seed(5);
    await db.query("INSERT INTO rental_payments(session_id,intent_id,booking_id,type) VALUES ('cs_constraint','pi_constraint',5,'rental_balance')");
    const values = [['cs_constraint','pi_new',3,'deposit'], ['cs_new','pi_constraint',3,'deposit'], ['cs_new','pi_new',5,'rental_balance'], ['cs_new','pi_new',3,'bad_type']];
    for (const [i, row] of values.entries()) await assert.rejects(db.query('INSERT INTO rental_payments(session_id,intent_id,booking_id,type) VALUES ($1,$2,$3,$4)', row), (e: any) => e.code === (i === 3 ? '23514' : '23505'));
  });
  const { checkBackendSafeguards } = await import('./backend-safeguards.postgres.ts');
  await checkBackendSafeguards({ db, flow, seed, snapshot, sent, check });
  console.log(`RESULT ${passed} passed, ${failures} failed`);
} finally {
  await attempts?.end(); await pool?.end();
  if (started) {
    console.log(command('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']));
    try { command('pg_ctl', ['-D', data, 'status']); throw new Error('Disposable PostgreSQL is still running'); }
    catch (e: any) { if (e.status !== 3) throw e; console.log('CLEANUP VERIFIED: pg_ctl status exited 3 (no server running)'); }
  }
  rmSync(root, { recursive: true, force: true });
  assert.equal(existsSync(root), false);
  console.log('CLEANUP VERIFIED: disposable cluster directory removed');
}
if (failures) process.exitCode = 1;
