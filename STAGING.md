# Staging — the test copy of the site

Staging is a second copy of the website on Render, with its **own database**, **Stripe
test mode**, and **email that never reaches customers**. Try changes there first; only
merge to `master` (live) once they work.

```
feature branch ──► staging branch ──► check it on the staging site ──► master (LIVE)
```

## What makes staging safe (built into the code — `src/server/staging.ts`)
Turned on by the env var `APP_ENV=staging`:
- **No customer emails.** Every email is redirected to `STAGING_EMAIL_TO`, with the
  intended recipient shown in the subject (`[STAGING → guest@example.com] ...`) and
  BCC/CC removed. If `STAGING_EMAIL_TO` is not set, emails are logged and skipped.
- **No real money.** The server **refuses to start** if staging has a live Stripe key
  (`sk_live_` / `rk_live_`). Use test cards like `4242 4242 4242 4242`.
- **Hidden from Google.** `robots.txt` blocks everything and every response carries
  `X-Robots-Tag: noindex, nofollow`.
- **Red "STAGING · TEST SITE" badge** bottom-left on every page (`VITE_APP_ENV=staging`).

Its database starts empty and is filled by the normal seed (boats, captains, gallery,
sample reviews). **Never copy real customer data into staging** — make test bookings.

---

## One-time setup in Render

### 1. Create the staging database
Render dashboard → **New → Postgres**
- Name: `blueskies-db-staging`
- Region: **same region as the live web service**
- PostgreSQL version: **18**
- Plan: smallest paid plan (free databases are deleted after 30 days)

### 2. Create the staging web service
Render dashboard → **New → Web Service** → repo `sergep28/blueskiesboatrentals`
- Name: `blueskiesboatrentals-staging`
- Branch: **`staging`**
- Region: same as the database
- Build command: `npm install && npm run build && npm run seed && npm run seed:properties`
- Start command: `npm start`
- Plan: **Free** is fine to start (it sleeps after 15 min idle, so the background
  email scans only run while it's awake). Upgrade to Starter if you need those tested.
- Auto-deploy: **On**

### 3. Environment variables on the staging service
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_ENV` | `staging` |
| `VITE_APP_ENV` | `staging` |
| `DATABASE_URL` | the **Internal Database URL** of `blueskies-db-staging` (NOT the live one) |
| `APP_URL` | the staging service's URL, e.g. `https://blueskiesboatrentals-staging.onrender.com` |
| `ADMIN_PASSWORD` | a **different** password from live |
| `STAGING_EMAIL_TO` | your own email address |
| `STRIPE_SECRET_KEY` | Stripe → **Test mode** → Developers → API keys → `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | from step 4 (`whsec_...`) |
| `RESEND_API_KEY` | same as live (safe — all mail is redirected to you) |
| `FROM_EMAIL` | same as live |
| `ANTHROPIC_API_KEY` | same as live (needed for the AI agent / blog) |
| `CRON_SECRET` | any long random string |

Leave out `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` and `GOOGLE_REVIEW_URL` (Search Console /
reviews are live-site only).

### 4. Stripe test webhook
Stripe dashboard → switch to **Test mode** → Developers → Webhooks → **Add endpoint**
- URL: `<APP_URL>/api/stripe/webhook`
- Event: `checkout.session.completed`
- Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` on staging.

### 5. Check it
Open the staging URL. You should see the red **STAGING** badge, and
`<APP_URL>/robots.txt` should say `Disallow: /`.

---

## Day-to-day
1. Make a branch for the change, as usual.
2. Merge it into **`staging`** → staging redeploys in 1–2 minutes → test it there.
3. When it works, merge the same branch into **`master`** → live.
4. Delete the branch.

Every so often, bring `staging` up to date with `master` so it matches live.

Known gap: a few static links inside email templates (e.g. "My Bookings", the blog
"view post" button) point at the live domain. Deposit, waiver, and reminder links use
`APP_URL` and correctly point at staging.
