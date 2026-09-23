# Payment-status correction — local review handoff

Status: locally tested; not committed, merged, deployed, or live verified.

Worktree: `/Users/sergebot/Projects/blueskies-payment-status-fix`
Branch: `fix/booking-payment-status`, base `cfce35c`.
Original master tree was clean; separate overnight worktree left untouched.
Dependencies reused via read-only-use `node_modules` symlink to original project (no installs).

## Implemented (forward code only)
- Manual creation no longer treats skipping Stripe checkout as proof of payment. Reservation remains confirmed, payment remains pending. It no longer increments paid spending/loyalty/referral commission or sends the paid confirmation; existing waiver-packet path remains.
- Missing Stripe configuration no longer auto-pays/confirms a public booking. It returns the saved pending booking with `checkoutUnavailable: true`, without sending manual-flow emails. The public form stays on an explicit checkout-unavailable notice with its saved reference/contact link, does not mark the quote booked, and removes the form to prevent immediate duplicate submission. A null checkout URL is handled defensively the same way.
- BookingSuccessPage gates paid totals, earned/claim-points copy and celebration on stored `paymentStatus === 'paid'`. Pending no longer claims payment is processing or promises automatic updates; loading/refunded states no longer claim confirmation. Nonpaid totals are labeled Booking Total.
- Imports no longer derive paid/refunded from confirmed/completed/cancelled or trip dates. Default is pending; API accepts an explicit validated paymentStatus independently. Only paid, noncancelled imports increment user financial stats.
- Added notices to manual-create and CSV-import screens. Current CSV client does NOT pass a payment-status column; its imports are therefore pending. Explicit paymentStatus support is API-level, not an implemented CSV mapping.
- The backend update API accepts `paymentStatus`, but NO admin UI action records offline rental receipts: the UI only displays the payment badge and does not send paymentStatus on save. An explicit, auditable offline-payment workflow remains unfinished. API payment edits do not reconcile customer financial stats, loyalty, commissions, or confirmation emails. No new payout status, ledger, tax policy, or historical reconciliation was invented.

## Evidence
Real tRPC caller tests with real Zod validation; DB, Stripe, email and deposit boundaries are mocked before router import. No real DB/email/deposit/Stripe implementation loads and no external services are called. Configured-Stripe tests use a synthetic key solely to select the mocked branch, preserve the checkout request and the manual waiver/$1,000 deposit-request behavior, and assert no rental-payment financial/referral accrual. Assertions inspect ORM payloads plus a single-booking in-memory state, not a live database; WHERE predicates/constraints are not evaluated.

React server-render tests exercise actual success-page markup for paid, pending, refunded, partially-refunded and loading states. Public-form tests capture the real mutation callback and retain hook state in an SSR harness to assert no success navigation, no quote completion, the unavailable notice/reference, and normal checkout redirect. Router/API, animation, QR and signature boundaries are mocked; these are not browser interaction tests and SSR does not execute effects (including confetti).

Observed RED before fixes: manual payment was paid instead of pending; confirmed/completed imports were paid, cancelled imports refunded; even pending imports incremented user stats. Explicit paid with pending reservation was stripped/ignored before schema correction. Copy checks failed before notices were added.

Commands from this worktree:
- `node --import tsx --experimental-test-module-mocks --test tests/*.test.ts` — 19 tests passing, 0 failed (9 route behavior, 8 rendered-UI/callback tests, 2 source-text notice checks). Node v25.8.0; module mocking emits experimental warning. Review-fix RED runs observed: unavailable flag undefined instead of true; public callback navigated to `/booking/success/BSC-UNPAID`; four nonpaid/loading renders made false paid/earned/processing/confirmation claims. All green after the narrow fixes.
- `npm run build` — Vite build passes; existing large-chunk warning.
- `./node_modules/.bin/tsc --noEmit` — exit 2, same pre-existing AdminMarketing.tsx:216 nullable name/email mismatch as baseline; no changed diagnostics.
- `git diff --check` — passes.
No pre-existing test suite/test script was present. No browser, PostgreSQL constraints, Stripe webhook/payment integration, or production verification performed. New-user creation, explicit refunded/date-defaulted imports, and explicit paid-import customer-stat reconciliation remain additional coverage opportunities; they were not broadened into this blocker fix.

## Investigated, deliberately not silently redesigned
- AdminBookings table and drawer render persisted paymentStatus independently of booking status. A pending reservation can display paid if the stored payment field is paid; forcing the UI to derive payment from reservation status would hide real prepaid reservations. Readiness dots measure paperwork/deposit readiness, not trip payment.
- AdminAnalytics.tsx getPlatform reads specialRequests beginning `Via ` rather than source. Extra notes after that line can create spurious platform groups. Manual creation stores source correctly via SOURCE_MAP, but addIsOta compares lowercase values against title-case dropdown values, so OTA pricing guidance can be wrong.
- importBookings accepts platform/description but persists neither source nor notes and still backs tax out of all imported totals, including OTA. Requires a separate source/tax slice with fixture coverage.
- misc.ts stats.overview sums every paid booking, including cancelled; AdminAnalytics and AdminBookings monthly totals exclude cancelled; AdminFleet includes paid cancelled bookings. These are inconsistent, but choosing whether retained cancellation money counts is an owner accounting decision, not a safe blind filter change.
- Backend API payment edits update the row but do not reconcile user lifetime spend/loyalty/referral commissions or confirmation emails; no corresponding offline-payment admin UI action exists. A follow-up explicit payment-recording workflow needs idempotency/audit semantics. These are not fixed by changing creation defaults.
- The public create endpoint still accepts privileged-looking skipPayment/customPrice/source inputs. Inherited authorization issue; not expanded or fixed here.
- Checkout-unavailable UX and payment-status-based success text are now corrected locally. The saved pending request is not automatically retried or removed; a durable checkout-resume workflow remains out of scope. UI notices persist only while the current page remains mounted.

## Release/business decisions
1. What evidence must an admin record to mark offline money paid? Should paying by a platform mean guest paid the platform or funds received by Blue Skies? Keep these distinct; current schema cannot represent both.
2. Should a manual reservation auto-confirm while unpaid? This patch preserves existing reservation behavior while removing the invented payment. Existing waiver email and, with Stripe configured, the $1,000 security-deposit request/link are also preserved; neither is evidence of rental payment. Confirm this separation with the owner.
3. Define paid revenue vs booking value vs bank receipts, tax inclusion, retained cancellation fees and refunds before harmonizing dashboard totals.
4. Decide CSV payment-column semantics and review UI preview/validation before offering bulk paid imports.
5. Reconcile existing records only from actual payment/platform evidence and explicit approval. No historical record, including Jason Blake, was inspected or corrected by this worktree.

No commits, pushes, deployments, email, payment actions, production DB access or network mutations were performed.
