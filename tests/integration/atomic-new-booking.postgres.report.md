# NEW atomic booking: disposable PostgreSQL evidence

**PASS — 34 passed, 0 failed; exit 0.** Existing 29 checks plus five new checks. Full suite executed twice successfully, each against a newly initialized PostgreSQL 16.13 cluster. Final evidence: `atomic-new-booking.postgres.log`.

## Reproduce

From repository root:

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp node --experimental-test-module-mocks --import tsx tests/integration/rental-postgres.disposable.ts
```

## Verified

- Actual additive migration executed twice at startup and twice after older-flow fixtures. Existing rows unchanged, creation requests initially empty; request primary key, booking uniqueness and booking foreign key present.
- Actual `bookingsRouter.createCaller(...).create` → runtime → flow → store → PostgreSQL. Real Drizzle binds creation inserts to the store's actual transaction client. DB module substitution is connection wiring to the disposable pool, not a query mock. Stripe and Resend constructors alone replace external providers; removed the older application-email module mock.
- Eight simultaneous identical UUID submissions observed waiting on the same real PostgreSQL advisory lock (`pg_stat_activity` / `pg_blocking_pids`). Before unlock no user, booking, plan, request or send; after completion exactly one of each record and one initial send. All responses share booking identity; exact retry returns it without another send.
- Changed guest count under the same UUID rejects with `Creation request reused with different input`; all table snapshots and send count unchanged.
- Late real PostgreSQL CHECK violation on collection plan insertion (SQLSTATE 23514, `synthetic_atomic_failure`) rolls back previously inserted user, booking and request. Seven complete table snapshots unchanged, zero sends. Removing only the test constraint allows the identical UUID to recover successfully.
- At every Resend call, an independent pooled connection reads the committed request, booking, user and plan with durable initial message state `sending`. Assertions also verify confirmed/pending/requested states, zero paid benefits, collection and waiver links, and matching provider idempotency key. Boundary proof failures are retained and asserted outside the runtime's catch block, so swallowing a provider error cannot hide a failed assertion.
- Uncertain provider response preserves committed booking and `messages.initial='uncertain'`; eight concurrent identical retries return that same identity and warning, with unchanged rows and no second message.
- No Stripe checkout/refund calls for new atomic creation.

## Safety and cleanup

- Cleared process environment (`env -i`), synthetic `.invalid` contacts and provider keys, actual schema-derived fixtures. No application bootstrap, dotenv, customer data, production services or external provider/network calls.
- Fresh private Unix socket; TCP disabled (`listen_addresses=''`); checked server data directory and `inet_server_addr() IS NULL`.
- Enrollment flag enabled only transiently inside this isolated test process and removed in `finally`; no deployment/config changes.
- Final cluster `/tmp/rental-pg-fpWa9Y`: stopped; `pg_ctl status` exited 3; cluster directory removed. Separate filesystem/process-list check confirmed no directory or matching running process.

## Findings and limits

No implementation defect found in the requested scenarios; no implementation files modified. Expected Node experimental-module-mocking warning only. Existing integration directory is untracked in this worktree; nothing staged or committed. This evidence supplements ATOMIC_NEW_BOOKING_HANDOFF.md's previous mocked-DB evidence without editing that handoff (ownership limited to tests/integration).

Not release authorization, proof of inbox delivery, or crash-recovery/operator reconciliation coverage. Durable `sending`/`uncertain` states still intentionally suppress automatic resend.
