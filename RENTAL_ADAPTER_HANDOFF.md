# Rental collection adapter handoff — development only

## Implemented and wired (offline validation; not deployed)
- Separate opt-in `rental_collections` table (no historical enrollment/backfill), checkout-attempt reservation and unique payment ledger. Additive boot migration in `src/db/ensure-rental-collections.ts`; fails closed before listen.
- Real PostgreSQL adapter serializes first enrollment/session reuse/settlement on booking row locks. Plan, ledger, payment evidence, user stats, referral commission update in one transaction. Unique session, intent and booking/type ledger constraints defend against duplicate effects.
- Admin tRPC enrollment and status endpoints; random 256-bit capability never added to public booking payloads.
- `GET /rental/:token[/deposit]` shows a payment form without creating a checkout (safe for email scanners); `POST` validates snapshot/eligibility, creates/reuses Stripe checkout, redirects 303.
- Signed Stripe webhook delegates tagged collection sessions before legacy handlers; verifies metadata booking, expected session, exact cents, USD, successful payment, intent. Duplicate session deliveries have no repeat financial effects. Rental receipt balance is zero after paid; security deposit stays separate.
- Dedicated Resend adapter respects existing staging guard. Initial/deposit/rental messages use durable per-kind states plus provider idempotency keys. No external integration was called.
- Existing website checkout remains on existing flow; enrolled bookings cannot fall into its financial handler.
- Rental reminder scanner exists but is disabled unless `RENTAL_COLLECTION_REMINDERS_ENABLED=true`; `RENTAL_COLLECTION_REMINDER_LEAD_DAYS` defaults to 1 (implementation proposal, not owner-approved timing).

## Admin UI API contract (UI is future work)
Use existing authenticated tRPC transport (server `adminProcedure`, existing Bearer admin auth).
- `bookings.enrollRentalCollection.mutate({bookingId: integer > 0, mode: 'deposit_first', confirmDirectUnpaid: true})`
  - Strict input: no public mode/source selection. Admin must explicitly attest existing booking is direct and rental unpaid; legacy default `source=direct` alone never enrolls anything.
  - Only direct/phone/walkin, rental pending, not cancelled, positive rental/deposit allowed. Reject existing rental checkout ID or unsettled existing deposit checkout ID; reconcile/expire outstanding legacy checkout before opting in.
  - Snapshots exact booking ID/ref, source, total, start/end date, boat, deposit amount and email; changes fail closed instead of silently rebilling.
  - Commits enrollment then sends initial message. Response: `{enrolled:true, mode, dueDate, rentalTotalCents, rentalBalanceCents, depositCents, depositStatus, rentalUrl, depositUrl, messages, communicationError}`. Communication failure does NOT roll back enrollment; display warning and inspect messages. Never claim customer received mail merely because enrollment succeeded.
- `bookings.rentalCollectionStatus.query({bookingId})` returns `{enrolled:false}` or same status data without communicationError.
- Treat URLs as private capabilities. UI must not put tokens in public search/booking responses.
- Admin `requestDeposit` returns enrolled capability deposit URL, not another legacy Stripe checkout. Legacy public `/deposit/:ref` does not disclose enrolled capability.

## Explicit remaining release limitations / review gates
- No PostgreSQL database was contacted or migration applied. Offline SQL-capture tests prove transaction commands/payloads, NOT real constraints, rollback behavior or concurrent locking. Disposable PostgreSQL integration/concurrency test is a release gate when authorized.
- `sending` / `uncertain` email states suppress automatic resends (at-most-once safety). There is not yet an operator reconciliation/retry UI or durable outbox retry worker. A crash before provider send can strand a message. Admin status exposes this; do not claim guaranteed eventual delivery.
- A separately committed checkout-attempt key prevents crash/retry duplicate checkout creation. Ambiguous attempts older than 23 hours fail closed for manual review (before Stripe idempotency retention can lapse); reconciliation tooling is not implemented.
- Existing already-open provider sessions cannot be uncharged by server-side validation. Editing/cancelling/changing source after session issuance fails closed on subsequent checkout and webhook; any externally accepted payment requires manual refund/reconciliation. Automatic session expiration on booking edits/cancellation remains unfinished.
- Legacy deposit session creation and enrollment need review of in-flight cross-route concurrency before release; preexisting stored session IDs are rejected, but a legacy provider request already in flight may not yet have stored its ID. New collection operations themselves use row locks and ledger constraints.
- Legacy website/deposit webhook internals remain largely inherited; new collection verification/transactions are not a claim that all historical legacy webhook paths were hardened.
- No historical correction (including Jason), financial aggregate reconciliation, admin UI, deployment, production credentials, live DB, Stripe/Resend calls, emails, payments, commits or pushes.

## Verification checkpoint
- Observed RED then GREEN for new receipt/snapshot, schema, store, admin auth, Stripe attempt, webhook and actual HTTP tests.
- `node --experimental-test-module-mocks --import tsx --test tests/*.test.ts`: **45/45 passed** at checkpoint (includes another agent's readiness changes).
- `npx tsc --noEmit`: only known baseline `AdminMarketing.tsx:216` nullable recipient error.
- Logs: `rental-adapters-tests.log`, `rental-adapters-types.log`. Final verification will refresh after remaining small edits.
