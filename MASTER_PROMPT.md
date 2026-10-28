# Hermes Express — Master Prompt & Stage Prompts

How to use this file:
1. Do the **one-time setup** below.
2. Put `CLAUDE.md` in the root of your `hermes-express` folder and `PLAN.md` in `hermes-express/docs/`.
3. Open a terminal in the folder, type `claude`, and paste the **Master Prompt (Stage 0)**.
4. When a stage is merged, start a **fresh** Claude Code session (`/clear`) and paste the next stage prompt.
5. At the end of every stage, run `/export` in Claude Code and save the log as `docs/ai-logs/<date>-stage-N.md`.

Tip: press **Shift+Tab** in Claude Code to switch to **Plan mode** before pasting a stage prompt. Claude will plan without editing files until you approve.

---

## One-time setup (do this before Stage 0)

1. **Install tools**
   - Node.js LTS: https://nodejs.org (check with `node -v`)
   - Git (check with `git -v`)
   - GitHub CLI: https://cli.github.com (check with `gh --version`)
2. **Create a GitHub account** at https://github.com/signup, then run:
   ```
   gh auth login
   ```
3. **Create a Vercel account** at https://vercel.com/signup, and sign up **with GitHub**.
4. Your folder should look like this:
   ```
   hermes-express/
   ├─ CLAUDE.md
   ├─ MASTER_PROMPT.md   (optional, this file)
   └─ docs/
      └─ PLAN.md
   ```

---

## MASTER PROMPT — Stage 0: Project setup

```
You are helping me build "Hermes Express" for the NYHA Junior Dev hackathon. I'm judged on:
(1) project architecture & plan, (2) clean, scalable, industry-standard code in GitHub,
(3) how properly I use AI tools (my AI conversation logs are reviewed), and
(4) team-readiness documentation.

Read CLAUDE.md and docs/PLAN.md fully before doing anything. They are the source of truth.

This session is STAGE 0: project setup only. No features yet.

First, give me a numbered plan for this stage and wait for my "go".

Stage 0 tasks:
1. Initialize git if needed. Create branch `stage-0-setup`.
2. Scaffold Next.js (latest stable, App Router, TypeScript strict, Tailwind, ESLint, src/ dir,
   import alias @/*) in the CURRENT folder without deleting CLAUDE.md or docs/.
3. Add Prettier (+ prettier-plugin-tailwindcss) and shadcn/ui init.
4. Add npm scripts exactly as listed in CLAUDE.md (lint, typecheck, test, test:coverage,
   test:e2e, build, db:generate, db:migrate, db:seed). Use placeholder implementations where the
   feature doesn't exist yet, but they must run without errors.
5. Set up Vitest + Testing Library with a coverage config: thresholds 90% for src/lib/** and
   src/server/**, 70% overall. Add one sample test so the suite runs.
6. Set up Playwright with one smoke test that loads the home page.
7. Set up Drizzle ORM with the Neon serverless driver: src/db/index.ts, src/db/schema.ts
   (empty for now), drizzle.config.ts, src/db/migrations/. Read DATABASE_URL from env.
8. Create .env.example with every variable from PLAN.md §10. Make sure .env* is git-ignored
   except .env.example.
9. Create src/config/site.ts with name, tagline, contacts (Instagram @jrcbrr_,
   phone 09390082560, email johnrudolph2010@gmail.com) and the 3 branches from PLAN.md §7.
10. Create .github/workflows/ci.yml: on pull_request and push to main → npm ci, lint,
    typecheck, test:coverage, build, then Playwright E2E. Cache npm.
11. Create docs: README.md (overview, stack, quick start, placeholders for live link and
    screenshots), docs/SETUP.md, docs/ARCHITECTURE.md (with a Mermaid system diagram from
    the plan), CONTRIBUTING.md (branching, commit prefixes, PR checklist), CHANGELOG.md,
    docs/AI_LOG.md (with the format from CLAUDE.md), docs/ai-logs/.gitkeep,
    docs/decisions/0001-tech-stack.md (short ADR explaining the stack choice).
12. Add a .github/pull_request_template.md with: summary, screenshots, how I tested,
    checklist (lint/typecheck/tests/build pass, docs updated, AI_LOG updated).
13. Run lint, typecheck, test, build. Fix anything that fails.
14. Commit in small logical commits with prefixes (chore:, docs:, test:, ci:).

Then STOP and give me step-by-step instructions (written for a beginner) to:
a) create the GitHub repo with `gh repo create hermes-express --public --source=. --push`
   and push main + the stage-0-setup branch,
b) import the repo into Vercel,
c) add Neon Postgres from the Vercel Marketplace/Storage tab and enable preview branching,
d) pull env vars locally with `npx vercel env pull .env.local`,
e) open the PR with `gh pr create` and check the preview deployment,
f) protect the main branch (require PR + CI passing).

Explain what each file you create is for, in plain language. I'm learning.
```

---

## Stage prompts

Paste one at a time in a fresh session (`/clear`), after the previous stage is merged into `main` and you've run `git checkout main && git pull`.

Every stage prompt ends with the same **closing block**, so it's included in each one.

### Stage 1 — Design system & landing page
```
Read CLAUDE.md and docs/PLAN.md (§3 Brand, §4 Pages). This is STAGE 1. Create branch
`stage-1-design` from main. Plan first and wait for my "go".

Build:
- Design tokens from PLAN.md §3 as CSS variables wired into Tailwind, for light and dark.
- next-themes light/dark toggle (default: system).
- Fonts: Nunito (headings) and Inter (body) via next/font.
- Original minimalist SVG logo (winged coffee cup, single line, one color using
  currentColor) and an original minimalist Hermes mascot (line-art profile with a winged
  helmet) as React components. Also generate the favicon/app icon from the logo mark.
- Layout: desktop top bar, mobile top bar + bottom tab bar (Home, Menu, Build [raised center
  gold button], Cart, Profile), and footer with contacts and branches from src/config/site.ts.
- A sound toggle in the header (UI + a useSound hook that stores mute in localStorage; the
  actual sounds come in Stage 8).
- Landing page with all 7 sections from PLAN.md §4. Hero has a looping, subtle cup-filling
  animation. Use placeholder data for featured drinks until Stage 3.
- Respect prefers-reduced-motion. Check at 375px and 1280px.
- Tests for the theme toggle, the nav, and a Playwright check that the landing page renders
  on mobile and desktop.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 2 — Auth & roles
```
Read CLAUDE.md and docs/PLAN.md (§8, §9). This is STAGE 2. Create branch `stage-2-auth`
from main. Plan first and wait for my "go".

Build:
- Better Auth with email + password, using the Drizzle adapter on Neon.
- User fields: name, phone, role (customer | barista | admin, default customer), branchId
  (for baristas), pointsBalance (default 0), defaultAddress.
- /signup and /login pages (Zod validation, friendly formal error messages, PH phone format).
- Middleware + a requireRole() server helper. /barista/** needs barista or admin.
  /admin/** needs admin. Checkout, orders, favorites, rewards and profile need login.
- Rate limiting on auth routes.
- Header account menu: login/signup when logged out; profile, orders, rewards and logout when
  logged in; Barista/Admin links for those roles.
- Basic /profile page (edit name, phone, default address).
- Seed script part 1: branches from site config, an admin from SEED_ADMIN_EMAIL/PASSWORD,
  and one barista per branch.
- Generate and apply a migration.
- Tests: role checks, validation schemas, protected-route behavior; an E2E for sign up → log
  out → log in.
- Add an ADR: docs/decisions/0002-auth.md.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 3 — Catalog, menu & pricing
```
Read CLAUDE.md and docs/PLAN.md (§6, §9). This is STAGE 3. Create branch `stage-3-catalog`
from main. Plan first and wait for my "go".

Build:
- Tables: ingredient, product, branch_stock, promo_code (from the data model in §9).
  Generate + apply the migration.
- Seed every ingredient, signature drink, pastry, snack and promo code from PLAN.md §6, with a
  color hex for each liquid/topping (used by the builder animation).
- src/lib/money.ts: formatPeso() and centavo helpers.
- src/lib/pricing.ts: pure calculateDrinkPrice(config, catalog) and calculateCartTotals().
  This must be 100% unit tested with many cases (sizes, temps, shots, milks, syrups, toppings,
  limits, invalid configs).
- A DrinkConfig type + Zod schema shared by client and server.
- /menu page: tabs or sections for Signature Drinks, Pastries, Snacks. Cards show price,
  seasonal and sold-out states (sold-out is per branch; add a branch picker stored in a cookie).
  Signature drinks have "Add to cart" (wire it up in Stage 5) and "Customize" (opens /build
  prefilled; wire it in Stage 4).
- Replace the landing page's placeholder featured drinks with real signature drinks.
- Tests for pricing, money, schemas, and the menu page.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 4 — The Coffee Builder
```
Read CLAUDE.md and docs/PLAN.md (§5 especially). This is STAGE 4, the heart of the app.
Create branch `stage-4-builder` from main. Plan first (include a component tree and the
state design) and wait for my "go".

Build /build:
- Steps: Cup (size, temperature, ice slider) → Base (+ shots stepper) → Milk (+ amount
  slider) → Sweetener (sweetness slider 0-100% in 25 steps, up to 3 syrups) → Toppings (max 5)
  → Review (name the drink, quantity, live price, Add to cart, Save to favorites; the last
  two are wired in Stages 5 and 8).
- Builder state as a reducer/state machine in src/lib/builder/ with an undo history stack and
  reset. Fully unit tested.
- Animated SVG cup: each liquid POURS in (a stream from the top), settles as a colored LAYER,
  layers STACK, then a MIX animation (swirl) blends them into the final color. Toppings drop on
  top (foam, drizzle, pearls). Ice cubes for iced, steam for hot, thicker texture for blended.
  Use Motion. Keep it subtle and smooth (60fps); respect prefers-reduced-motion (show the end
  state with no motion).
- Sticky price bar with a tap-to-expand breakdown, using calculateDrinkPrice.
- Sold-out options for the selected branch are disabled and labeled.
- "Surprise me" button: random valid config (src/lib/builder/random.ts, tested).
- Open prefilled from a signature drink (/build?from=<slug>) and from a cart item for editing
  (/build?edit=<cartItemId>; leave a TODO if the cart isn't built yet).
- Layout: desktop = cup left, controls right; mobile = cup on top, controls below, Next/Back
  pinned above the bottom tab bar.
- Fully keyboard-operable with screen-reader labels.
- Tests: reducer, undo/reset, random, step navigation, price updates; an E2E that builds a
  drink.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 5 — Cart, checkout & orders
```
Read CLAUDE.md and docs/PLAN.md (§7). This is STAGE 5. Create branch `stage-5-checkout`
from main. Plan first and wait for my "go".

Build:
- Cart (persisted in localStorage for guests, merged into the account on login): multiple
  items, quantity, edit custom drink (reopens builder), remove, totals.
- Wire "Add to cart" from /menu and /build.
- Tables: order, order_item, order_status_event. Migration.
- /checkout (login required): pickup or delivery, branch, name, phone, address (delivery
  only, Taguig/BGC validation), note for barista, ASAP or scheduled (15-min slots within
  branch hours, up to 2 days ahead; the slot logic is a tested pure function), delivery fee
  rule (₱49, free at ₱800+).
- Demo payment: GCash (Demo), Card (Demo), Cash on Delivery. Fake processing screen, always
  succeeds, clearly labeled "No real payment is made."
- placeOrder server action: re-validate everything with Zod, RECOMPUTE all prices on the
  server, check sold-out at the branch, snapshot item configs, create the order with a short
  code like HX-7K2P, status Received.
- Redirect to /orders/[id] (a simple page is fine for now; the tracker comes in Stage 6).
- Promo codes and points are Stage 8; leave clear extension points.
- Tests: totals, delivery fee, schedule slots, placeOrder (including tampered client prices
  being ignored); an E2E for build → cart → checkout → order created.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 6 — Tracking & barista dashboard
```
Read CLAUDE.md and docs/PLAN.md (§7, §8). This is STAGE 6. Create branch
`stage-6-tracking` from main. Plan first and wait for my "go".

Build:
- src/lib/order-status.ts: statuses and allowed transitions (pickup → Ready for pickup;
  delivery → Out for delivery), fully tested.
- /orders/[id]: animated tracker (the Hermes mascot moves along the steps, the cup fills while
  Brewing, wings flap when Out for delivery), on-screen receipt, polling every 10s via a
  route handler. Only the order's owner, staff of that branch, or an admin can view it.
- /barista: live queue for the barista's branch, grouped by status, scheduled orders
  marked; one-tap "next status" buttons; new orders show a toast (+ sound hook) via polling.
- /barista/stock: sold-out toggles for ingredients and products at their branch.
- Every status change writes an order_status_event.
- Tests: transitions, authorization (a barista can't touch another branch's orders),
  queue grouping; an E2E where a barista advances an order and the customer sees it update.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 7 — Admin panel
```
Read CLAUDE.md and docs/PLAN.md (§8). This is STAGE 7. Create branch `stage-7-admin`
from main. Plan first and wait for my "go".

Build (admin only, all server-authorized):
- /admin/orders: all branches, filters (branch, status, date), update status.
- /admin/menu: create/edit products, prices, seasonal dates, active/hidden, per-branch
  sold-out.
- /admin/ingredients: edit builder options, prices, colors, order, active.
- /admin/customers and /admin/customers/[id]: search, view orders, edit name/phone/address,
  change role, assign a barista's branch, adjust points (writes the ledger in Stage 8; add
  the hook now).
- /admin: summary cards (today's orders, revenue, average order value) per branch. Charts
  come in Stage 9.
- Admin layout with sidebar on desktop and a drawer on mobile.
- Tests for every admin server action, including non-admins being rejected; an E2E where an
  admin changes a price and the menu shows it.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 8 — Rewards, favorites & extras
```
Read CLAUDE.md and docs/PLAN.md (§5 badges, §6 promos, §8). This is STAGE 8. Create branch
`stage-8-rewards` from main. Plan first and wait for my "go".

Build:
- Favorites: saved_drink table, "Save to favorites" in the builder, /favorites with one-tap
  reorder at current prices.
- /orders history with reorder.
- Loyalty points: points_ledger; earn 1 pt per ₱10 when an order is Completed; redeem 150/250/
  350 pts for a free 12/16/22oz drink at checkout (add-ons still charged); /rewards page.
- Promo codes at checkout (src/lib/promos.ts, fully tested: expiry, min subtotal, first order
  only, max uses, max discount).
- Ratings: 1-5 stars + comment per item after Completed.
- Badges: src/lib/badges.ts definitions + unlock checks after relevant events; user_badge and
  user_stat tables; badges shown on /rewards and /profile with an unlock toast.
- Email receipt via Resend on order placed (skip gracefully, with a log, if RESEND_API_KEY is
  missing).
- Sound effects: pour, clink, ding (small original or royalty-free files in public/sounds,
  credited in README), wired to the existing mute toggle.
- Admin points adjustment now writes to the ledger.
- Tests for points, promos, badges, ratings, favorites.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

### Stage 9 — Polish & final docs
```
Read CLAUDE.md and docs/PLAN.md. This is STAGE 9, the final stage. Create branch
`stage-9-polish` from main. Plan first and wait for my "go".

Build:
- Perfect Pour mini-game on the Base step (hold to pour, release at the gold line, no score,
  unlocks the Perfect Pour badge). Optional and skippable; keyboard + touch support.
- Admin sales dashboard charts with Recharts (revenue by day, orders by branch, top items).
- Accessibility pass (axe in Playwright on key pages) and fix issues.
- Performance pass: Lighthouse on landing, menu and build; fix anything under 90.
- Error pages (404 and error boundary) with the Hermes mascot; loading skeletons.
- Full E2E suite covering: signup, build, checkout with promo + points, tracking, barista
  flow, admin edit.
- Final docs: README with live link, screenshots (desktop + mobile), feature list, demo
  accounts table, stack, architecture summary; docs/ARCHITECTURE.md updated with the final
  data model (Mermaid ER diagram); SETUP.md verified from scratch; CHANGELOG complete;
  AI_LOG.md reviewed for completeness.

Closing block: run lint, typecheck, test:coverage, build and fix failures. Commit in small
prefixed commits. Update CHANGELOG.md and add a docs/AI_LOG.md entry. Push and open a PR with
`gh pr create` using the template. Then tell me what to check on the Vercel preview.
```

---

## After each stage: your checklist
- [ ] CI is green on the PR
- [ ] You clicked through the Vercel preview on phone and desktop
- [ ] You understand what changed (ask Claude to explain anything you don't)
- [ ] Merge the PR, then `git checkout main && git pull`
- [ ] `/export` the Claude Code session → `docs/ai-logs/<date>-stage-N.md`, then commit it
- [ ] Add your own notes to the `docs/AI_LOG.md` entry (what *you* decided, changed or rejected)
