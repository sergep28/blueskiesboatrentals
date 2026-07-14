# Where we left off — July 13, 2026

Repo: `github.com/sergep28/blueskiesboatrentals` · deploys from **`master`** → Render
web service **blueskiesboatrentals** (DB service **Blueskies-db**, Postgres 18).
Stack: React 19 + Vite + tRPC + Drizzle ORM + Render Postgres.

## How to resume with Claude
> "Picking up the blueskiesboatrentals work. Read NEXT_STEPS.md."

---

## ⚠️ Deploy / DB architecture — READ THIS FIRST
- Render auto-deploys **`master` only**. Push to master = live in ~20–100s.
- **`ADMIN_PASSWORD` must be set in Render.** The server now **refuses to boot in
  production without it** (`src/server/trpc.ts`) — deliberately, so it can never
  silently serve an unauthenticated admin API again. A deploy failing with
  `ADMIN_PASSWORD is not set` is the guard working, not a bug.
- **Do NOT put `npm run db:push` in the build.** `drizzle-kit push` fails on this DB
  (schema drift on pre-existing primary keys, Postgres `42P16`) and silently breaks
  every schema-changing deploy.
- **Schema changes are provisioned at server startup** by the `ensure*()` functions
  in `src/db/ensure-*.ts` (raw `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). When you
  add a column to `src/db/schema.ts`, also add it to the matching `ensure-*.ts`.
- Render web Shell mangles long pastes — avoid heredocs/base64 there.

---

## What shipped 2026-07-13 (all live on master)

### 1. Real server-side auth — the admin API had NONE
`src/server/trpc.ts` previously exported only `publicProcedure`. Every endpoint —
refunds, deposits, customer lists — answered **any request from anyone**. The only
gate was `const ADMIN_PIN = '1101'` hardcoded in `AdminLayout.tsx`, shipped to every
visitor's browser, and the server never checked it.
- `adminProcedure` verifies an `ADMIN_PASSWORD` bearer credential (constant-time
  compare) and rejects before any handler runs. **69 endpoints locked** across 12
  routers; the public/admin split was derived from which pages actually call each
  endpoint. Customer flows (booking, waiver signing, blog, listings) stay public.
- Login persists in `localStorage`; Log out button in the sidebar.

### 2. PII leak on the homepage — CLOSED
`HomePage.tsx` called `bookings.list` (every customer's name, email, phone, total)
just to grey out calendar dates — shipping the whole customer list to every visitor.
Replaced with `bookings.publicAvailability`, which returns only `"boatId-date"`.

### 3. The AI Agent has real tools, behind a hard approval gate
- `src/server/agent-tools.ts`. Read tools (`look_up_booking`, `list_bookings`) run
  freely. **`draft_email` / `draft_deposit_link` CANNOT act** — they only write a
  `pending` row to `agent_actions`. The Resend/Stripe calls live in `executeAction()`,
  whose **only** caller is the `approveAction` mutation behind an admin click.
- Approval cards in the chat: **Preview** (renders the real branded email),
  **Edit** (fix recipient/subject/body), Approve, Discard. Approve is atomic
  (`pending → executing` in one conditional UPDATE) so a double-click can't send twice.
- **The agent fabricated a live-looking Stripe URL** (`cs_live_…`) in an email to a
  real customer. It has no way to know a real one. Now enforced in code: any Stripe
  or `/waiver/` or `/deposit/` URL in a drafted body is **REJECTED**. The agent writes
  `{{DEPOSIT_LINK}}` / `{{WAIVER_LINK}}`; the server substitutes real URLs at send time
  and renders them as branded buttons.
- Model: `claude-sonnet-4-6` → **`claude-sonnet-5`**. Blog/social generation was
  silently broken (bare `JSON.parse` + `max_tokens: 4096` truncating an 800–1500 word
  post); now uses structured outputs.

### 4. Deposit links no longer expire
Stripe Checkout sessions die in ~24h, and emails baked one in — so an OTA guest who
booked weeks out clicked a **dead link** and couldn't pay. Emails now point at
`/deposit/:ref` (`src/server/index.ts`), which mints a **fresh** session on click.
Removed 3 duplicate copies of the Stripe session code.

### 5. Readiness nudges (7 / 3 / 1 days out) + Resend packet button
Previously the ONLY follow-up was the pre-trip reminder fired when `charterDate ===
tomorrow`. A far-out OTA booking heard nothing for weeks, then we chased a signature
the night before. Now `src/server/readiness-nudges.ts` scans every 6h and emails only
what's still missing (agreement / ID / crew waivers / deposit). Fully-ready bookings
are never emailed. Stamped per milestone (`readiness_nudge_stage`). At 1 day out,
Serge also gets an alert naming who to call.
Plus a **Resend packet** button on each booking (`bookings.resendWaiverPacket`).

### 6. Email visibility
- **Email → Sent mail**: every email ever sent (search/filter, click to see the exact
  HTML the customer got). The data was always logged; it had no screen.
- **Serge is BCC'd on all 7 customer-facing emails.**
- Agent emails now carry their `bookingRef` so they show on the booking timeline.

### 7. Stripe fee on deposit refunds — recovered
Stripe keeps its fee **even on a full refund**, so a clean trip cost ~$29.30 on a
$1,000 deposit (~$2,900/yr). Now disclosed in the rental agreement's Security Deposit
section and **deducted by default** (computed from the actual deposit), with a
checkbox to waive.
Also: the settle form had dollar boxes and no reason field — a customer received
"Damage $95.00" with no explanation. **Every deduction now requires a plain-English
reason**; Settle stays disabled until each charged line has one.

---

## ⚠️ Top of the next session

1. **Waive the processing fee for anyone who signed the OLD agreement.** Trips already
   on the books never saw the clause — untick the box when settling those.
2. **The deposit charge → refund path has still never run end-to-end with real Stripe.**
   Check `STRIPE_SECRET_KEY` in Render (`sk_test_` = safe, `sk_live_` = a real $1,000
   charge), then: request a deposit → pay → confirm it flips to "held" → Settle & Refund
   → confirm the refund lands.
3. **Watch the first readiness nudges.** They're live and scan every 6h — any incomplete
   booking inside 7 days gets chased automatically.

## Next build (agreed, not started)
- **Authorization holds instead of charging the deposit.** Eliminates the Stripe fee
  entirely rather than passing it on: authorize, then capture only what you keep
  (clean trip = **$0** in fees; keep $255 = fee on $255 only).
  Constraint: card auths expire in **7 days**, so the hold must be placed ~3 days
  before the trip (booking lead time is irrelevant — place it from the same scan that
  sends the readiness nudges). **Breaks on long multi-day charters**: hold + trip must
  fit in 7 days, so it only works for trips up to ~4 days. Plan: pick by trip length —
  holds for short trips, charge-and-refund (with the fee deducted) for long ones.
- **Content scheduler.** There is NO automatic content generation. The daily
  blog/social calendar in the agent's system prompt is **prose, not a cron job** —
  nothing generates content unless you click the button. If you want "posts every
  morning," it has to be built.

## Open security follow-ups
- Rotate the Postgres password (was shared in chat).
- Remove `0.0.0.0/0` from the Postgres IP allowlist.
- Confirm `STRIPE_WEBHOOK_SECRET` is set (deposits + trip payments rely on the webhook).
- Consider 2FA (emailed code via Resend) on top of the password — deliberately deferred.

## Known pre-existing issue (not from this session)
- `src/client/pages/admin/AdminMarketing.tsx:216` has a type error (nullable
  `name`/`email` passed as non-nullable). Doesn't block the build.
