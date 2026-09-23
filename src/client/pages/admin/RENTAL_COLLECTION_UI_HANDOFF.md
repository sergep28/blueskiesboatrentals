# Admin deposit-first UI — locally validated, not released

## Scope
UI scope includes `AdminBookings.tsx`, new `RentalCollectionPanel.tsx`, new `NewBookingCreate.tsx`, and UI/copy tests. Existing dirty payment-status/backend changes remain owned by their respective slices. The bounded finish pass changed only `NewBookingCreate.tsx`, its UI regression test, and this handoff. No backend changes, installs, service startup, network/provider calls, commits, configuration changes or deployment were performed by the finish pass.

## Operator path
Open an existing booking's details → Deposit-first rental collection → Set up → explicit direct/unpaid attestation → Confirm enrollment & send initial email. Uses the authenticated tRPC `rentalCollectionStatus({bookingId})` and `enrollRentalCollection({bookingId, mode:'deposit_first', confirmDirectUnpaid:true})` contract. Opening, rendering, refreshing and copying are read-only with respect to email/checkout creation.

Eligibility excludes non-direct/phone/walkin sources, nonpending rental payments, cancellation, nonpositive amounts, stored legacy rental checkout, and unsettled legacy deposit checkout. Unsaved edits/pending legacy operations block setup. Backend validation remains authoritative. Paid deposits do not imply paid rent and do not block an otherwise eligible booking.

Enrollment requires a second deliberate button explaining the live initial-email side effect. A synchronous submission latch prevents repeated clicks. The parent remembers attempted booking IDs until this page unmounts, including drawer reopen, and suppresses legacy packet/deposit request controls when status is unknown, enrollment was attempted, or enrollment is active. No automatic retry or resend is supplied.

Readback shows rental total, outstanding rental balance/status, exact server deadline, refundable security deposit amount/status, private copy-only rental/deposit links, and each communication state. Tokens are not placed into navigation links, broad records, browser storage or logs by this component. Clipboard failure is explicit. Communication failure is not represented as enrollment rollback; `sending`/`uncertain` states require manual review. An ambiguous mutation error warns enrollment may already have committed, locks local retry, and offers status refresh. A successful enrollment is not described as delivered email or collected money.

## New-booking creation and recovery
Add Booking now offers explicit deposit-first opt-in for manual direct/phone/walk-in bookings, with separate initial-email consent. Website has its own source option and remains legacy-only, as do OTA/other sources. The UI submits the atomic `bookings.create` collection mode, not a follow-up enrollment call; it does not enable the server enrollment flag. Copy distinguishes a confirmed reservation, pending rental payment, and a separate refundable security deposit.

Before sending an opted-in request, the UI saves its UUID and exact normalized payload in tab-scoped sessionStorage. A synchronous latch suppresses double clicks; unresolved requests block edited/new submissions. Closing the modal does not unmount recovery. Reload restores the original request without sending it. Explicit retry sends the original UUID/payload only, with no automatic retry. Warnings explain that retry may initiate an email never reserved, while uncertain/sending messages require manual review.

Reconciliation/reset requires operator attestation and is blocked while sending; clearing storage does not itself submit a booking or email. This is not server-verified reconciliation: clearing a reconciled record leaves the form's draft fields intact, so an operator can still deliberately resubmit those fields after attesting. Do not recreate a located booking; manage it through its details. Recovery is limited to this tab and can be lost by closing the tab or clearing browser storage; it does not provide cross-tab duplicate protection. Legacy creation remains outside this deposit-first recovery mechanism.

Known success clears recovery, resets/closes the parent form and refreshes booking/readiness/customer lists. If cleanup fails, creation stays blocked and the UI warns that the booking was saved. Saved receipts show reference/ID, communication failure/uncertainty and stale-status warnings. Missing message snapshots show `status unknown`; they must not throw before recovery cleanup. “Sent” means provider acceptance, not inbox delivery. Explicit status refresh does not recreate or resend. Private payment URLs are excluded from receipt state and recovery storage.

## Evidence and remaining gates
Tests exercise actual rendered panel and Add Booking controls/callbacks with mocked tRPC/clipboard boundaries and retained hook state, including exact payloads, consent/source gating, repeated click suppression, close/reopen and reload recovery, reconciliation guards, communication warnings, and read-only status refresh. This is not real-browser end-to-end or live-provider verification.

The finish pass reproduced TS18048 at `NewBookingCreate.tsx:47` and a runtime failure when a successful saved response omitted `collection.messages`. A new regression failed with `Cannot read properties of undefined (reading 'initial')`; optional chaining fixed it without casts. The targeted suite then passed 9/9. Final whole-suite/typecheck/build/diff results are reported by the finish-pass summary after all edits, using:
- `node --import tsx --experimental-test-module-mocks --test tests/*.test.ts`
- `./node_modules/.bin/tsc --noEmit`
- `npm run build`
- `git diff --check`

Whole-suite checkpoint: **91/91 passed**, with no failures, skips or cancellations. Vite production build succeeded (3058 modules); it warns about chunks larger than 500 kB. A trailing blank line in the new test was removed after checking untracked files separately; the final summary records the subsequent rerun.

The unrelated baseline `AdminMarketing.tsx:216` nullable-recipient type error is intentionally untouched. Node module-mocking warnings are experimental-tooling warnings, not evidence of provider delivery. Existing adapter handoff release gates still apply: live reminder/owner-alert verification, real PostgreSQL concurrency, provider reconciliation and deployment are not established by these offline tests. UI guards are not a replacement for backend cross-route serialization or provider reconciliation.
