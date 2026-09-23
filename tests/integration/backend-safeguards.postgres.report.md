# Backend safeguards: disposable PostgreSQL verification

## Result

**29 passed, 0 failed; process exit 0.** Original 10 cases plus 19 backend safeguard cases. Full output: `tests/integration/backend-safeguards.postgres.log`.

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp \
  node --experimental-test-module-mocks --import tsx \
  tests/integration/rental-postgres.disposable.ts
```

PostgreSQL 16.13, fresh private Unix socket cluster `/tmp/rental-pg-40wWDn`, TCP disabled; SQL identity confirmed `inet_server_addr=null` and the expected data directory. No dotenv, application bootstrap, production DB, real Stripe/email client, or external network request. Enrollment release environment remains unset. Uses actual current additive migration twice and schema-derived synthetic base tables (not a complete production-schema migration test).

## Added coverage

- Both orderings of **actual** `createDepositLink` versus `RentalFlow.authorize`. A third real transaction holds the booking lock; both entrypoints are queued, and `pg_blocking_pids` proves the blocked chain before release. Legacy-first leaves one durable attempt, no enrollment/email; enrollment-first leaves one plan/email, no legacy attempt/provider call.
- Legacy provider timeout: pause inside mocked Stripe boundary, query committed attempt from a separate connection while request is unresolved, reject enrollment and retry both before and after timeout, preserve all other state, exactly one provider request with stable idempotency key.
- Twelve simultaneous calls to actual legacy webhook settlement helper for rental and deposit payments. Exactly one nonduplicate financial transition; rental user/count/spend/loyalty/referral commission only once; deposit does not increment rental aggregates. Replay and conflicting intent covered.
- Legacy invalid evidence rejected without DB effects. Real late referral CHECK-constraint failure proves booking/user writes roll back; removal of synthetic constraint permits one successful settlement.
- Actual admin tRPC cancellation, manual payment, immutable-snapshot edits, refund, and legacy settlement rejection on enrolled bookings. Full booking/user/plan/payment/referral/attempt snapshots remain unchanged; provider/email counters unchanged. Mixed financial + nonfinancial edit cannot partially write. Refund fixture is otherwise eligible (paid deposit + intent), preventing a false positive from unrelated eligibility rejection.

DB module replacement is dependency wiring to **real Drizzle over the disposable pool**, not a mocked query result. The booking financial guard, deposit service, routes, rental store/flow, migration, and settlement helper execute unchanged. Only Stripe/email effects are faked.

## Findings / limitations

No new source defect reproduced in this scope. Existing handoff release gates and recovery limitations are not cleared by these tests. In particular, timeout behavior is intentionally permanent fail-closed/manual reconciliation, not automatic recovery. This suite calls the actual webhook settlement helper, not HTTP signature verification/event-dispatch ingress. It does not test the other agent's new-booking flow or production data/schema compatibility.

Node reports the expected experimental module-mocking warning. This runtime flag is now required by the extended harness.

## Cleanup

`pg_ctl ... stop` completed; subsequent `pg_ctl status` exited **3** (no server). Directory removal verified with `existsSync(...) === false`. Only `tests/integration/*` changed; no implementation changes, environment-file reads, commits, or pushes.
