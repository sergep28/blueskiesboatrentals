# Where we left off — July 10, 2026

Repo: `github.com/sergep28/blueskiesboatrentals` · deploys from **`master`** → Render
web service **blueskiesboatrentals** (DB service **Blueskies-db**, Postgres 18).
Stack: React 19 + Vite + tRPC + Drizzle ORM + Render Postgres.

## How to resume with Claude
> "Picking up the blueskiesboatrentals work. Read NEXT_STEPS.md."

---

## ⚠️ Deploy / DB architecture — READ THIS FIRST
- Render auto-deploys **`master` only**. Push to master = live in ~20–100s.
- **Do NOT put `npm run db:push` in the build.** `drizzle-kit push` fails on this DB
  (schema drift on pre-existing primary keys, Postgres `42P16`) and silently breaks
  every schema-changing deploy. It was removed from `render.yaml` on 2026-07-10.
- **Schema changes are provisioned at server startup** by the `ensure*()` functions
  in `src/db/ensure-*.ts` (raw `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). When you
  add a column to `src/db/schema.ts`, also add it to the matching `ensure-*.ts`.
- Render web Shell mangles long pastes — avoid heredocs/base64 there.

## What shipped in the 2026-07-10 session (all live on master)
- **Signed rental agreement**: downloadable PDF per booking. Agreement text is shared
  between the public page and the PDF via `src/client/lib/rentalAgreementText.ts`.
- **$1,000 security deposit flow**: `bookings.requestDeposit` (Stripe Checkout link),
  webhook auto-marks paid (idempotent via `deposit_stripe_event_id`), owner email alert
  (`sendDepositPaidAlert`), and itemized settle (Fuel/Damage/Misc → refund, recorded on
  `deposit_deductions_note`). `markDepositPaid` = manual off-platform fallback.
- **Trip Readiness panel** (top of the AdminBookings drawer): one-glance status of the 5
  pre-boarding gates — rental agreement, government ID, safety waivers (signed/total),
  conditional inspection, security deposit — each with Copy/Text/Email resend. Backed by
  `bookings.readiness` (single) and `bookings.readinessList` (dots on the list rows).
- **Mandatory renter ID upload** (renter/operator, front+back): a required step in the
  renter link flow (`/waiver/<ref>?renter=1` → agreement → ID → waiver in `WaiverPage`),
  plus an admin backup uploader/viewer. Stored on `bookings.id_front/id_back/id_uploaded_at`;
  excluded from `bookings.list` payload, loaded on demand.
- **Unified booking `source`** column; **pickup/drop-off times**; **Custom duration** can
  now span an end date; **base-price editing** (type pre-tax base, tax always 7.5% on top).
- **Quotes** (Send Booking Link page) now support **edit + delete**.
- Booking drawer widened to `max-w-2xl`.

## ⚠️ Top of the next session — verify the live Stripe deposit
The deposit charge→refund path is **code-verified only** — never run end-to-end with a
real Stripe charge. **Before using it with a real renter**, do one test:
- Check Stripe mode: Render → blueskiesboatrentals → Environment → `STRIPE_SECRET_KEY`
  (`sk_test_` = safe test mode; `sk_live_` = a real, refundable $1,000 charge).
- Open a booking → Trip Readiness → Security Deposit → **Request $1,000 Deposit Link** →
  pay it → confirm it auto-flips to "held" and you get the email alert → **Settle & Refund**
  → confirm the Stripe refund lands.

## Open decisions / smaller items
- **"Send Booking Link" (Quotes) page** = customer self-pay flow (they pay the full trip
  online via link). Sergey questioned whether to keep it — undecided.
- Consider: readiness could also gate/notify on the bookings list beyond the dot.

## Open security follow-ups (from earlier, still valid)
- Rotate the Postgres password (was shared in chat).
- Remove `0.0.0.0/0` from the Postgres IP allowlist.
- Admin auth is still a 4-digit PIN (`AdminLayout.tsx`) — harden before scaling marketing.
- Confirm `STRIPE_WEBHOOK_SECRET` is set (deposits + trip payments both rely on the webhook).
