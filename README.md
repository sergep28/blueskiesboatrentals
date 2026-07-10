# Blue Skies Boat Rentals

React 19 + Vite + tRPC + Drizzle ORM + Render Postgres. Live at
**www.blueskiesboatrentals.com**, deployed from the **`master`** branch → Render.

---

## 🖥️ Working on this from another computer (e.g. your laptop)

You do **not** need any database or Stripe secrets to work on this. The workflow is
edit → push → Render auto-deploys. Secrets live on Render, not on your computer.

### 1. One-time setup on the new computer
Install these if they aren't already there:
- **Git** — https://git-scm.com/downloads
- **Node.js** (v20 or newer) — https://nodejs.org
- **GitHub access** — sign in so you can push. Easiest: install the GitHub CLI
  (`brew install gh` on Mac) then run `gh auth login`.

### 2. Get the project
```bash
git clone https://github.com/sergep28/blueskiesboatrentals.git
cd blueskiesboatrentals
npm install
```

### 3. The normal workflow (how everything shipped)
```bash
# ...make changes...
npm run build          # confirms it compiles (no secrets needed)
git add -A
git commit -m "what changed"
git push origin master # Render auto-deploys in ~1–2 minutes
```
That's it — push to `master` and the live site updates automatically.

### 4. Resume with Claude Code
Open Claude Code in the project folder and say:
> "Picking up the blueskiesboatrentals work. Read NEXT_STEPS.md."

`NEXT_STEPS.md` has the full current state, the deploy rules, and what's still to do.

### (Optional) Running the site locally
Only needed if you want to run it on your own machine instead of using the live site.
Create a `.env` file (never commit it) with at least `DATABASE_URL` (from Render →
Blueskies-db → connection string) plus the Stripe/Resend keys, then `npm run dev`.
For normal work you can skip this entirely and just use the deploy workflow above.

---

## ⚠️ Two rules that keep deploys working
1. **Deploy only from `master`** — Render watches that branch.
2. **Never add `npm run db:push` to the build** — it fails on this DB and breaks the
   deploy. Schema changes are provisioned at startup by `src/db/ensure-*.ts` (add a new
   column to `src/db/schema.ts` AND to the matching `ensure-*.ts`).

See `NEXT_STEPS.md` for everything else.
