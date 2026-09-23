# Atomic admin new-booking deposit-first slice

Supersedes the **new-booking unsupported** statements in BACKEND_REVIEW_HANDOFF.md / RENTAL_ADAPTER_HANDOFF.md only. Development implementation; NOT release authorization.

## Exact UI contract
Authenticated existing `bookings.create.mutate` accepts all existing booking fields plus:
```ts
{
  collectionMode: 'deposit_first',
  creationRequestKey: crypto.randomUUID(),
  source: 'direct' // or 'phone' / 'walkin'; omitted defaults to direct in this mode
}
```
- Checkbox explicitly selects deposit-first. Never infer selection from skipPayment, source or a sent link. When unchecked omit collectionMode/creationRequestKey (legacy behavior unchanged).
- Generate/persist ONE UUID for a submission before sending. Keep UUID **and exact submitted fields** across network errors/retries, including reload recovery. Do not mint a new UUID on a communication warning. Changed input with the same key is rejected. One key is one booking, not one HTTP attempt.
- `skipPayment` can be omitted (default false); selected collectionMode overrides checkout behavior. Existing customPrice/pricing semantics untouched. Do not send website/OTA/other source with this mode.
- Admin authorization and `RENTAL_COLLECTION_ENROLLMENT_ENABLED === 'true'` required, checked before any writes. Both Stripe and email configuration required before the transaction. Do not enable the environment flag during development.

Successful response for this mode:
```ts
{
  bookingId: number,
  bookingRef: string,
  total: number, // dollars
  checkoutUrl: null,
  checkoutUnavailable: false,
  collection: {
    enrolled: true,
    mode: 'deposit_first',
    dueDate: string, // YYYY-MM-DD, America/New_York
    rentalTotalCents: number,
    rentalBalanceCents: number,
    depositCents: number, // new booking currently $1,000 / 100000 cents
    depositStatus: string, // initially requested
    rentalUrl: string, depositUrl: string, // PRIVATE capability URLs
    messages: Record<string, 'sending' | 'sent' | 'uncertain'>,
    communicationError: boolean,
    statusUnavailable: boolean
  }
}
```
Normal first response has messages.initial='sent', communicationError=false, statusUnavailable=false. `sent` means provider accepted, NOT proof of inbox delivery. Failed/uncertain send returns the SAVED booking with communicationError=true; do not show creation failure or automatically create another booking/send. Show warning + inspect status. If statusUnavailable=true, collection fields are the last committed snapshot, not a fresh read; refresh `bookings.rentalCollectionStatus({bookingId})` when available. Even if the HTTP response itself is lost, retry the identical request with its original UUID, never a new one.

## Implementation
- Store owns BEGIN/COMMIT/ROLLBACK. Creation callback gets its actual PG client; Drizzle user/booking inserts use that same connection. Confirmed reservation + pending rental + requested separate deposit + immutable collection snapshot commit together.
- Additive `rental_creation_requests` table stores request UUID, hash, booking ID. Transaction advisory lock serializes concurrent identical UUID submissions before user/booking writes; same-key different payload rejected. Rollback removes request/booking/enrollment together. No backfill.
- After commit only, durable initial collection message is reserved/sent using existing RentalFlow. No legacy checkout/waiver packet, no paid benefits. Initial email includes one collection deposit link, separate rental balance link, renter agreement/ID link and crew-waiver link.
- Existing website/OTA/manual non-opt-in branches and public customPrice semantics unchanged. No UI touched.

## Evidence and launch limits
- Strict observed RED→GREEN endpoint tests for atomic flow, durable retry after uncertain send, and post-commit DB failure warning. Five focused tests also cover pre-write admin/default-off/source/request-key rejection and rollback/no-send.
- Actual tRPC create caller -> runtime -> flow -> store exercised; external provider constructors, DB client and Drizzle binding mocked. No real DB/provider/network used. These are NOT proof of real PostgreSQL concurrent locking or migration execution.
- New additive migration and this creation path still require separately authorized disposable PostgreSQL integration/concurrency validation before release (existing old-flow integration evidence doesn't cover this new table/path).
- Enrollment/reminders remain DEFAULT OFF. No .env/config changed. Initial email's sending/uncertain states intentionally suppress auto-resend; operator reconciliation remains necessary. A crash after commit/before send may leave unsent paperwork; exact request retry can initiate a never-reserved message, but uncertain/sending requires manual review.
- No secrets, production action, historical correction, commit, deploy, or source reset.
