# Where we left off — May 18, 2026

## What's working now
- Postgres database, all bookings + customers persist
- CSV import: 50 bookings + 36 customers loaded from the Google Sheet
- Loyalty system: 1pt = $1 spent, Captain tier (10% off at $5k+), First Mate (5% off at $2.5k+), Crew (no tier)
- Admin: editable customers, editable bookings (dates / total / end date), List + Calendar views, Upcoming/Past filter, sortable columns
- Public site: multi-day bookings block the right days on `/book` and `/boat/1` calendars (after deploy + hard refresh)
- Captain checkbox copy fixed to "We'll confirm availability after booking"

## ⚠️ Two things still TODO at the top of next session

### 1. Create the blackout-dates table (the "block off certain dates" feature)
The code is deployed but the new database table doesn't exist yet. Until this runs, clicking days on the Fleet calendar won't save.

**Do this:**
1. Render dashboard → `blueskiesboatrentals` → **Shell** (left sidebar)
2. Wait for `~/project/src $` prompt (~10 sec)
3. Type exactly: `npx tsx scripts/create-blackouts-table.ts`
4. Should print `✓ boat_blackouts table is ready`

### 2. Test a $1 booking through the live site
We need to know **what mode Stripe is in** before doing this:
- Render → blueskiesboatrentals → **Environment** tab
- Find `STRIPE_SECRET_KEY` → reveal first ~7 characters
- If it starts with `sk_test_` → test mode (fake card, safe)
- If `sk_live_` → live mode (real $1 charge, refundable)
- If missing → no Stripe yet, booking auto-confirms

Tell Claude which one, and Claude will:
- Create a $1 "quote" via API (overrides the price for one specific URL)
- Give you a link like `https://www.blueskiesboatrentals.com/book?quote=BS-XXXXXX`
- You go through the booking flow at $1 total

## Open security follow-ups (no rush, but should happen)
- **Rotate Postgres password** (it was shared in chat with Claude). Render → Blueskies-db → Credentials → New default credential → delete the old one.
- **Remove `0.0.0.0/0` from Postgres IP allowlist** (currently DB is reachable from anywhere). Render → Blueskies-db → Networking → remove the everywhere rule.
- **Upgrade admin auth** — currently just a 4-digit PIN. Fine for soft launch, but should add real auth before scaling marketing.

## Open polish items mentioned but not built
- Stripe webhook setup in Stripe dashboard (if Stripe live keys aren't already wired with `STRIPE_WEBHOOK_SECRET` env var)
- Daily Postgres backup verification (Render does it automatically, but test a restore once)
- Bigger Vite bundle warning — could code-split for performance but doesn't block anything

## How to resume the conversation with Claude
Just tell Claude:
> "Picking up the blueskiesboatrentals work. Read NEXT_STEPS.md."

Claude has memory of the session and will have full context.

## All 14 PRs merged so far
The repo is at `master` commit `~ea9da18` or newer. Branch `postgres-migration` is parallel with master.
