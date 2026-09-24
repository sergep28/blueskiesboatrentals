# Disposable PostgreSQL rental verification

## Referral typing fix — final verification

**PostgreSQL integration: 10 passed, 0 failed (exit 0), PostgreSQL 16.13 (Homebrew).** The historical failure below was reproduced before patching: 9 passed, 1 failed (exit 1), SQLSTATE `42P08`, `numeric versus real`. That fresh red output is preserved in `rental-postgres.referral-red.log`.

Only the referral INSERT SELECT expression in `src/server/rental-store.ts` was changed:

```diff
-SELECT id, $2, $3, round(($3::numeric * commission_rate::numeric / 100), 2)
+SELECT id, $2, $3::real, round(($3::real::numeric * commission_rate::numeric / 100), 2)
```

Both parameter occurrences now have the schema's `real` type; the commission calculation converts that typed value to `numeric` for rounding. Other agents' safeguards were preserved. No regression assertions or API changes were made.

The exact environment-isolated reproduction command below was run before and after the patch. `rental-postgres.disposable.log` now contains the final green output. The unchanged 12-concurrent-referral-settlements regression verifies one ledger entry, paid rental status, one user increment, one referral with amount 500 and commission 50, and one receipt. Both runs verified `pg_ctl status` exit 3 and removed their respective private cluster directories (`/tmp/rental-pg-OcqLEJ`, `/tmp/rental-pg-gK9Cyc`). No production services, secrets, installs or commits were used.

Full-suite command:

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp node --experimental-test-module-mocks --import tsx --test tests/*.test.ts > tests/integration/rental-postgres.referral-full-suite.log 2>&1
```

**Full suite at this concurrent-work checkpoint: 69 passed, 3 failed, 72 total (exit 1).** Failures are outside this SQL-only scope and were not hidden or modified:

- `backend-review-guards.test.ts`: uncertain initial email on repeated enrollment — missing expected rejection.
- `rental-admin-details-ui.test.ts`: actual details mount/legacy controls — undefined value `.toFixed()` in `AdminBookings`.
- `rental-admin-details-ui.test.ts`: unknown/enrolled collection states — undefined value `.toFixed()` in `AdminBookings`.

Node also emits its expected experimental module-mocking warning. The log preserves the complete output. These files are being worked on by sibling agents; this is a checkpoint, not a claim of final whole-worktree readiness.

## Historical pre-fix outcome

The remaining sections record the original investigation; their failure output and no-implementation-edit statements describe that earlier run, not the final verification above.

## Outcome

**9 passed, 1 failed on PostgreSQL 16.13 (Homebrew).** Production implementation was not modified. The failing integration test exposes a real SQL parameter-type error not caught by mocked tests.

### Release blocker

`src/server/rental-store.ts:38-40`, referral INSERT during rental settlement, fails with:

```
error: inconsistent types deduced for parameter $3
code: 42P08
detail: numeric versus real
```

The schema defines `referral_transactions.amount` as PostgreSQL `real`. The query uses `$3` as that amount and also `$3::numeric` in the commission expression. PostgreSQL rejects conflicting parameter inference. All 12 concurrent referral settlement attempts failed. Snapshot assertions verified that every failed attempt rolled back booking, user statistics, payment ledger, collection state and referral changes. Thus no partial financial effects, but rental settlement with a referral is blocked.

Suggested implementation direction (not applied): consistently type the parameter as `real` for the inserted amount and cast that explicitly typed value to numeric for rounding, or use independently typed parameters. The failing test asserts successful settlement and remains red; it does not normalize the bug as expected behavior.

## Exact reproduction command

From `/Users/sergebot/Projects/blueskies-payment-status-fix`:

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp ./node_modules/.bin/tsx tests/integration/rental-postgres.disposable.ts > tests/integration/rental-postgres.disposable.log 2>&1
```

Exit code: **1**. Complete actual output: `rental-postgres.disposable.log`. Initial exploratory run (before removing dependent-test fallout): `rental-postgres.disposable.initial.log`.

## Final actual test output

```
PASS actual additive migration twice leaves historical booking untouched and unenrolled
PASS concurrent first enrollment yields one plan, one initial message and no historical backfill
PASS booking ID and token routes block on same real PostgreSQL row lock
PASS 12 concurrent checkout requests create one committed attempt and one provider call
PASS invalid payment evidence rolls back without booking, state, ledger or financial changes
VERIFIED: all failed referral settlements rolled back every financial/state write
FAIL 12 concurrent duplicate settlements have exactly one financial effect error: inconsistent types deduced for parameter $3
PASS 12 duplicate settlements without referral commit one ledger and one user increment
PASS late plan constraint failure rolls back prior ledger, booking and user writes
PASS separate checkout reservation survives outer rollback and rejects old ambiguous retry
PASS database constraints independently reject duplicate session, intent, booking/type and invalid type
RESULT 9 passed, 1 failed
CLEANUP VERIFIED: pg_ctl status exited 3 (no server running)
CLEANUP VERIFIED: disposable cluster directory removed
```

## Isolation and fidelity

- Each run creates a fresh `/tmp/rental-pg-*` cluster with `initdb` and a private Unix socket directory. TCP listening is disabled (`listen_addresses=''`); socket port is nondefault 55439.
- Pool connection identity and PostgreSQL data directory are asserted; `inet_server_addr()` is null. No preexisting database, app DB module, `.env`, `DATABASE_URL`, real customers, Stripe or Resend are accessed. Environment is cleared by the reproduction command; PostgreSQL child processes also receive an explicit minimal environment.
- Base tables are generated from actual Drizzle table column definitions, including real/text types, defaults, column uniqueness and primary keys. This is not a full historical migration replay. The rental tables are created by the actual `ensureRentalCollections` implementation twice.
- Actual store, flow and checkout reservation code runs against real PostgreSQL connections. `pg_blocking_pids` observes a backend blocked on the booking-row lock; no timing-only lock assertion.
- Only provider/email boundaries are in-memory fakes; no external network. These tests verify local reservation and serialization, not Stripe-side idempotency behavior.
- Non-referral concurrent settlement produces exactly one ledger record, one user booking count increment, $500 total spent, five loyalty points and one receipt.
- A late unique-token violation proves rollback after ledger, booking and user updates. Five invalid evidence variants also leave all persisted state unchanged.
- Separately committed reservation survives an outer transaction rollback and an aged 24-hour attempt fails closed before provider invocation.
- Both runs stopped PostgreSQL via `pg_ctl -m fast -w stop`, verified `pg_ctl status` exit 3, and removed their disposable directories.

Only new dedicated integration test/log/report files were written. No installs, implementation edits, commits, pushes or deployment.
