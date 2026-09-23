// Run ONLY with: env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp node --import tsx tests/integration/enrolled-refunds.postgres.ts
// Private socket-only disposable PostgreSQL. Stripe is an in-memory fake; no app/provider credentials.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import pg from 'pg';
import { ensureRentalCollections } from '../../src/db/ensure-rental-collections.ts';
import { settleEnrolledDeposit } from '../../src/server/enrolled-deposit-settlement.ts';
for (const key of ['DATABASE_URL', 'PGHOST', 'PGSERVICE', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY']) assert.equal(process.env[key], undefined);
const root = mkdtempSync('/tmp/enrolled-refund-pg-');
const socket = `${root}/socket`, data = `${root}/data`;
mkdirSync(socket);
const bin = '/opt/homebrew/opt/postgresql@16/bin';
const env = { PATH: '/opt/homebrew/bin:/usr/bin:/bin', HOME: root, LC_ALL: 'C' };
const command = (name: string, args: string[]) => execFileSync(`${bin}/${name}`, args, { env, encoding: 'utf8' });
let started = false;
let pool: pg.Pool | undefined;
try {
  command('initdb', ['-D', data, '-U', 'refund_test', '--auth=trust', '--no-locale', '--encoding=UTF8']);
  command('pg_ctl', ['-D', data, '-l', `${root}/postgres.log`, '-o', `-k ${socket} -p 55441 -c listen_addresses='' -c fsync=off`, '-w', 'start']);
  started = true;
  pool = new pg.Pool({ host: socket, port: 55441, user: 'refund_test', database: 'postgres', ssl: false, max: 12 });
  assert.equal((await pool.query("SELECT inet_server_addr() AS address, current_setting('data_directory') AS dir")).rows[0].address, null);
  assert.equal((await pool.query("SELECT current_setting('data_directory') AS dir")).rows[0].dir, data);
  await pool.query(`CREATE TABLE bookings (id integer PRIMARY KEY, booking_ref text NOT NULL, deposit_status text NOT NULL,
    deposit_amount real NOT NULL, deposit_payment_intent_id text, deposit_stripe_session_id text,
    deposit_refunded_amount real NOT NULL DEFAULT 0, deposit_deductions_note text, updated_at text);
    INSERT INTO bookings(id,booking_ref,deposit_status,deposit_amount,deposit_payment_intent_id,deposit_stripe_session_id)
    VALUES (1,'TEST-1','paid',1000,'pi_1','cs_1'),(2,'TEST-2','paid',1000,'pi_2','cs_2'),
      (3,'TEST-3','paid',1000,'pi_3','cs_3'),(4,'TEST-4','paid',1000,'pi_4','cs_4'),
      (5,'TEST-5','paid',1000,'pi_5','cs_5'),(6,'TEST-6','paid',1000,'pi_6','cs_6'),
      (7,'TEST-7','paid',1000,'pi_7','cs_7');`);
  await ensureRentalCollections(pool);
  for (const id of [1, 2, 3, 4, 5, 6, 7]) {
    await pool.query('INSERT INTO rental_collections (booking_id,token,state) VALUES ($1,$2,$3)', [id, `token-${id}`, JSON.stringify({ depositCents: 100000, depositReceived: true })]);
  }
  for (const id of [1, 2, 3, 5, 6, 7]) await pool.query('INSERT INTO rental_payments(session_id,intent_id,booking_id,type) VALUES ($1,$2,$3,$4)', [`cs_${id}`, `pi_${id}`, id, 'deposit']);
  const refunds = new Map<string, any[]>();
  const calls: any[] = [];
  let ambiguous = false;
  const stripe: any = {
    paymentIntents: { retrieve: async (id: string) => ({ id, status: 'succeeded', currency: 'usd', amount_received: 100000 }) },
    refunds: {
      list: async ({ payment_intent }: any) => ({ data: refunds.get(payment_intent) ?? [], has_more: false }),
      create: async (params: any, opts: any) => {
        calls.push({ params, opts });
        const refund = { id: `re_${params.payment_intent}`, payment_intent: params.payment_intent, amount: params.amount, status: 'succeeded', metadata: params.metadata };
        refunds.set(params.payment_intent, [refund]);
        if (ambiguous) { ambiguous = false; throw Error('Synthetic network timeout AFTER acceptance'); }
        return refund;
      },
    },
  };
  const settle = (id: number, deductions: number, note?: string) => settleEnrolledDeposit(pool!, stripe, { bookingId: id, deductions, deductionsNote: note });
  // RED: the paid enrolled booking must be refundable, independently of rental balance.
  const results = await Promise.all(Array.from({ length: 8 }, () => settle(1, 25, 'Fuel: $25')));
  assert.equal(calls.length, 1);
  assert.ok(results.every(r => r.refundAmount === 975 && r.deductions === 25));
  assert.equal(results.filter(r => r.newlySettled).length, 1);
  const booked = (id: number) => pool!.query('SELECT * FROM bookings WHERE id=$1', [id]).then(r => r.rows[0]);
  assert.equal((await booked(1)).deposit_status, 'partially_refunded');
  assert.equal((await booked(1)).deposit_refunded_amount, 975);
  assert.equal((await booked(1)).deposit_deductions_note, 'Fuel: $25');
  await assert.rejects(settle(1, 0), /already settled|different/i);
  assert.equal(calls.length, 1);
  // A timeout after provider acceptance leaves a committed immutable claim. Reconcile before retry.
  ambiguous = true;
  await assert.rejects(settle(2, 0), /network timeout/);
  assert.equal((await booked(2)).deposit_status, 'paid');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrolled_deposit_refunds WHERE booking_id=2')).rows[0].n, 1);
  const recovered = await settle(2, 0);
  assert.equal(recovered.refundAmount, 1000);
  assert.equal((await booked(2)).deposit_status, 'refunded');
  assert.equal(calls.length, 2);
  await assert.rejects(settle(2, 1), /already settled|different/i);
  // Never refund more than provider-paid/plan-approved; no clamp of invalid deductions.
  await assert.rejects(settle(3, 1001), /deductions|amount/i);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrolled_deposit_refunds WHERE booking_id=3')).rows[0].n, 0);
  const originalRetrieve = stripe.paymentIntents.retrieve;
  stripe.paymentIntents.retrieve = async () => ({ id: 'pi_3', status: 'succeeded', currency: 'usd', amount_received: 50000 });
  await assert.rejects(settle(3, 0), /paid|approved|amount/i);
  stripe.paymentIntents.retrieve = originalRetrieve;
  assert.equal(calls.length, 2);
  // Historical paid card deposit enrolled without a rental_payments row still settles.
  assert.equal((await settle(4, 1000, 'Damage: $1000')).refundAmount, 0);
  assert.equal((await booked(4)).deposit_status, 'partially_refunded');
  assert.equal(calls.length, 2);
  refunds.set('pi_5', [{ id: 're_external', payment_intent: 'pi_5', status: 'succeeded', amount: 1, metadata: {} }]);
  await assert.rejects(settle(5, 0), /Other provider refund/);
  assert.equal((await booked(5)).deposit_status, 'paid');
  assert.equal(calls.length, 2);
  // Old ambiguous claims can reconcile an existing refund but cannot reissue
  // a Stripe key outside the guaranteed provider idempotency window.
  await pool.query(`INSERT INTO enrolled_deposit_refunds
    (booking_id,intent_id,paid_cents,refund_cents,deduction_cents,provider_key,state,created_at)
    VALUES (6,'pi_6',100000,100000,0,'enrolled-deposit-refund-6-pi_6','claimed',now() - interval '25 hours')`);
  await assert.rejects(settle(6, 0), /idempotency window/);
  assert.equal(calls.length, 2);
  // A provider-accepted but unfinished refund never marks the booking refunded.
  const createRefund = stripe.refunds.create;
  stripe.refunds.create = async (params: any, opts: any) => {
    const result = await createRefund(params, opts);
    result.status = 'pending';
    return result;
  };
  await assert.rejects(settle(7, 0), /pending/);
  assert.equal((await booked(7)).deposit_status, 'paid');
  assert.equal((await pool.query('SELECT state FROM enrolled_deposit_refunds WHERE booking_id=7')).rows[0].state, 'pending');
  refunds.get('pi_7')![0].status = 'succeeded';
  assert.equal((await settle(7, 0)).newlySettled, true);
  assert.equal((await booked(7)).deposit_status, 'refunded');
  assert.equal(calls.length, 3);
  console.log('PASS enrolled deposit settlement: concurrency, reconciliation, limits, historical paid, zero refund');
} finally {
  if (pool) await pool.end();
  if (started) command('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
  rmSync(root, { recursive: true, force: true });
}
