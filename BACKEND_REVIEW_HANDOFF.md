# Backend review repair (in progress; coordinate UI/PG agents here)

## API/release contract
- Existing enrollment is now DEFAULT OFF unless `RENTAL_COLLECTION_ENROLLMENT_ENABLED=true`. Do not set this during this task. Owner release review required. Status and reconciliation of existing enrollments remain available.
- New booking `bookings.create` accepts optional `collectionMode:'deposit_first'` ONLY to explicitly reject it before writes (admin auth checked first). Atomic new-booking/enrollment + after-commit initial message is NOT implemented. Do not expose a creation option, and do not emulate it by creating a legacy booking then enrolling. This path is a hard release gate.
- No client changes by backend agent. Existing enrollment response unchanged; repeated uncertain/sending initial message now reports communicationError rather than success.

## Lock contract for PG agent
- `src/server/booking-financial-guard.ts:withLegacyBooking` uses Drizzle transaction, `SELECT id FROM bookings ... FOR UPDATE`, then reads rental_collections in a separate statement; callback uses same tx.
- central `createDepositLink` reserves `rental_checkout_attempts.key='legacy-deposit-'+bookingId` under that lock and COMMITS BEFORE Stripe. Never deletes key, including timeout/crash. Repeated legacy attempt fails closed. Same key sent to Stripe as idempotency key.
- rental-store reads that legacy marker AFTER taking booking lock; RentalFlow.authorize rejects presence. No migration needed (reuses existing attempts table). Both race orderings: enrollment first rejects legacy at central guard; legacy first leaves durable marker that rejects enrollment.
- Financial edits/status/manual deposit/refund routes use withLegacyBooking. Unrelated update fields may proceed under lock. Legacy settlement now routes through `legacy-payment-settlement.ts` (same lock, enrollment rejection, session/intent/current-state dedupe, effects transaction); async success does not reach legacy.
- No changes to integration/local-postgres files. Real PG tests are another agent's responsibility.

## Recovery (manual, not automatic retry)
1. Keep enrollment gate off while unresolved review items remain. For uncertain email, use admin status private capability URLs for individually verified manual delivery; NEVER tell customer email arrived based on enrollment.
2. Inspect durable collection messages and provider evidence with authorized operator access. Do not clear sending/uncertain states or generate a fresh key. A missing provider receipt is not proof no request arrived. Record evidence/operator/time in an incident before any controlled reconciliation.
3. Legacy attempt markers survive provider failure, timeout and process crashes. New automatic attempts intentionally blocked. Find original request/session with the exact `legacy-deposit-<bookingId>` key, reconcile actual charge and expired/open sessions. Do NOT delete marker to enroll or regenerate payment. If no safe proof is available, leave booking blocked; engineering must implement audited explicit reconciliation, not reset uncertain keys.
4. Enrolled cancel/edit/manual payment/refund is blocked until all old sessions and ambiguous attempts are reconciled/expired with provider confirmation. No bypass UI offered.

## Known inherited/deferred blockers
- Public customPrice and public quote conversion are inherited vulnerabilities. Public negotiated quote checkout depends on customPrice and has no authoritative quote binding. Left unchanged intentionally; requires a dedicated server-owned validated quote reservation/conversion design, not a silent breaking rejection.
- Legacy session regeneration now fail-closed after first provider attempt (including expired sessions); safe reuse/expiration recovery remains unfinished. Do not enable this as a frictionless production rollout.
- New-booking flow, automatic email reconciliation/outbox UI and audited session-expiration transitions remain unsupported.
- Final evidence will be appended after tests.
