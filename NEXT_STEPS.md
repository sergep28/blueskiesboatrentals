# Where we left off — September 15, 2026

Repo: `github.com/sergep28/blueskiesboatrentals` · deploys from **`master`** → Render
web service **blueskiesboatrentals** (DB service **Blueskies-db**, Postgres 18).
Stack: React 19 + Vite + tRPC + Drizzle ORM + Render Postgres.

## How to resume with Claude
> "Picking up the blueskiesboatrentals work. Pull the latest master, then read NEXT_STEPS.md."

**GitHub `master` is the source of truth.** Work happens on two computers (this Mac and
the MacBook Pro): always `git pull` first. One branch per change, merge it, delete it.
Plans go in this file, not in old branches. Update this file at the end of every session.

---

## ⚠️ Deploy / DB architecture — READ THIS FIRST
- Render auto-deploys **`master` only**. Push to master = live in ~20–100s.
- **`ADMIN_PASSWORD` must be set in Render.** The server **refuses to boot in
  production without it** (`src/server/trpc.ts`). A deploy failing with
  `ADMIN_PASSWORD is not set` is the guard working, not a bug.
- **Do NOT put `npm run db:push` in the build.** `drizzle-kit push` fails on this DB
  (schema drift on pre-existing primary keys, Postgres `42P16`).
- **Schema changes are provisioned at server startup** by the `ensure*()` functions
  in `src/db/ensure-*.ts` (raw `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). When you
  add a column to `src/db/schema.ts`, also add it to the matching `ensure-*.ts`.
- Render web Shell mangles long pastes — avoid heredocs/base64 there.

---

## Recent history (details in git log / closed pull requests)
- **2026-07-13:** real server-side admin auth; closed homepage customer-list leak; AI
  agent tools behind an approval gate (drafted emails can't contain real payment URLs —
  `{{DEPOSIT_LINK}}` / `{{WAIVER_LINK}}` placeholders only); permanent `/deposit/:ref`
  links; readiness nudges at 7/3/1 days; Sent-mail screen + BCC Serge; Stripe fee
  deducted on deposit refunds, with a required reason per deduction.
- **2026-08-09 (MacBook Pro):** SEO overhaul (sitemap, robots.txt, homepage OG tags,
  Tavernier + Duck Key location pages, llms.txt); blog rendering fixes; auto-blog
  endpoint `/api/cron/generate-blog` (Mon/Wed/Fri) with one-click approve-from-email;
  published blog photos auto-added to gallery; marina address fixed to
  **80460 Overseas Hwy**.
- **2026-09-15 (PR #41):** public lookups (`bookings.getByRef`, `bookings.getByEmail`,
  `users.getByEmail`) no longer return ID scans, signatures, or admin notes.

---

## Open — to do

### Bugs
1. **Boatsetter / GetMyBoat revenue is overstated.** OTA bookings are priced off our
   own rate card with 7.5% tax added, e.g. $900 + $67.50, when Boatsetter billed the
   guest, handled tax, and pays us a payout net of commission. Every OTA booking records
   more revenue than we actually receive. Fix: for `source` boatsetter/getmyboat, record
   exactly the payout entered (no rate-card fallback, no tax, no loyalty/referral
   discount), on create and edit; relabel the price field "Payout from Boatsetter".
   CSV import should also map the free-text platform column onto `source` and not back
   tax out of OTA rows. *(An old attempt exists on the stale local branch
   `fix-admin-booking-silent-failure` on the Mac — redo fresh on current master, don't merge it.)*
2. **Admin "Add booking" can fail silently.** The create mutation has no error display,
   so a server rejection looks like a dead button. Also `z.number().positive()` rejects
   a $0 negotiated price. Show the server's reason in the modal.
3. **AI model was downgraded on 2026-08-09** from `claude-sonnet-5` to
   `claude-sonnet-4-6` (`src/server/routes/agent.ts:21`). Probably unintentional; restore.

### Verify
4. **Deposit charge → refund has never run end-to-end with real Stripe.** Check
   `STRIPE_SECRET_KEY` in Render (`sk_test_` = safe, `sk_live_` = a real $1,000 charge),
   then: request deposit → pay → confirm "held" → Settle & Refund → confirm refund lands.
5. **Is the auto-blog actually scheduled?** `/api/cron/generate-blog` needs an external
   cron service to call it Mon/Wed/Fri — confirm one is configured.
6. Waive the processing fee when settling trips booked under the pre-July agreement.

### Next build (agreed, not started)
7. **Authorization holds instead of charging the deposit.** Eliminates the Stripe fee
   rather than passing it on: authorize, capture only what you keep. Card auths expire
   in **7 days**, so place the hold ~3 days before the trip from the readiness-nudge scan.
   Hold + trip must fit in 7 days → holds for trips up to ~4 days, charge-and-refund
   (fee deducted) for longer charters.

### Security follow-ups
- Rotate the Postgres password (was shared in chat).
- Remove `0.0.0.0/0` from the Postgres IP allowlist.
- Confirm `STRIPE_WEBHOOK_SECRET` is set (deposits + trip payments rely on the webhook).
- Consider 2FA (emailed code via Resend) on top of the password — deferred.

### Known minor issue
- `src/client/pages/admin/AdminMarketing.tsx:216` type error (nullable `name`/`email`
  passed as non-nullable). Doesn't block the build.
