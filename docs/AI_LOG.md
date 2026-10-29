# AI usage log

One entry per AI coding session (Claude Code). It records what I asked for, what the AI did, and what I reviewed, changed or rejected. Raw exported conversations are saved in [`ai-logs/`](ai-logs/) with `/export`.

Rules the AI follows are in [`../CLAUDE.md`](../CLAUDE.md). Stage prompts are in [`../MASTER_PROMPT.md`](../MASTER_PROMPT.md).

## Entry format

```
## YYYY-MM-DD — Stage N: <title>
- **Goal:**
- **Key prompts I gave:**
- **What the AI did:**
- **What I reviewed / changed / rejected and why:**
- **Problems & fixes:**
  - **Slow branch picker:** each click posted a form and waited for the server to rebuild the page. Now the browser switches on its own. The old cookie was HTTP-only, which the browser can't overwrite, so it was renamed to `hx_menu_branch`; otherwise anyone who had used the old picker would see their choice "forgotten".
  - **Photo sources:** Unsplash and Pexels block automated downloads, so the photos come from Wikimedia Commons, which has an official API and clear licences.
  - **Existing products had no photos:** the seed only inserts new rows, so it now also fills a photo where a product has none, without ever replacing one.
- **What I learned:**
- **Raw log:** docs/ai-logs/<file>.md
```

---

## 2026-10-28 — Stage 0: Project setup

- **Goal:** Set up the project foundation (Next.js, tooling, tests, database wiring, CI, docs) with no features yet, so every later stage starts from a working, tested, deployable base.
- **Key prompts I gave:**
  - The Stage 0 master prompt from `MASTER_PROMPT.md`: read CLAUDE.md and PLAN.md, plan first, then the 14 setup tasks.
  - "go" to approve the plan.
  - Later I switched Claude Code into plan mode, so it wrote a detailed plan file for the remaining steps, which I approved.
- **What the AI did:**
  - Wrote a numbered plan first and waited for approval.
  - Renamed `master` to `main`, committed the plan docs, created `stage-0-setup`.
  - Scaffolded Next.js 16.4.3 in a temporary folder and copied it in, so `CLAUDE.md` and `docs/` were not touched.
  - Read the Next.js 16 docs bundled in `node_modules` (as the generated `AGENTS.md` instructs) before configuring tests.
  - Added Prettier, shadcn/ui, Vitest (coverage gates), Playwright (desktop + 375px), Drizzle + Neon, `site.ts`, `.env.example`, CI, PR template and all docs.
  - Ran lint, format check, typecheck, tests with coverage, build and E2E, then committed in small prefixed commits.
- **What I reviewed / changed / rejected and why:**
  - Approved committing `MASTER_PROMPT.md` so reviewers can see how the AI was directed.
  - Approved a placeholder home page (name + tagline) so the tests check something real; the real landing page is Stage 1.
  - Interrupted the session once (while the AI was checking my Git identity), then switched to plan mode to review the remaining steps before more changes were made.
  - Commits use my GitHub noreply email, so my personal email stays out of a public repo.
  - Did the account steps myself (`vercel login`, `vercel link`, `vercel env pull`, importing the repo into Vercel, adding Neon), and had the AI create the public GitHub repo and open PR #1 only after I explicitly confirmed.
  - Set up branch protection on `main` myself. The AI found that my first settings (1 required approval, no bypass, no required checks) would block my own PRs forever while not enforcing CI. It explained this and waited for my OK; I then approved: PR required, 0 approvals, CI check "Lint, typecheck, test, build, E2E" required, no bypass, no force-push.
  - Asked the AI to merge PR #1 and handle the session log; it scanned the exported log for secrets before committing it to the public repo.
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **Git identity not set:** the first commit failed. Fixed by setting a repo-only identity (`jrcbrr` + GitHub noreply email).
  - **`create-next-app` refuses non-empty folders:** scaffolded into a temporary folder, then copied the files in.
  - **`LayoutProps` not found in typecheck:** Next 16 generates route types. Fixed by making `typecheck` run `next typegen` before `tsc`.
  - **Self-referencing font variable after shadcn init:** `--font-sans: var(--font-sans)`. Fixed by naming the Geist font variable `--font-sans` in `layout.tsx`.
  - **npm peer conflict installing `@vitejs/plugin-react`** (Babel 8 vs shadcn's Babel 7): left the plugin out, because Vite compiles JSX natively. No `--force` or `--legacy-peer-deps`.
  - **E2E tested the wrong app:** another local project was running on port 3000, and Playwright reused it. Fixed by giving E2E its own port (3100).
  - **`vercel link` / `vercel env pull` edited `.gitignore`:** both times they appended `.env*` after our `!.env.example` exception, which would make Git ignore `.env.example`. The AI caught it in `git diff` and reverted it; the existing rules already ignored `.env.local` and `.vercel/`.
  - **Neon connected:** `vercel env pull` brought in `DATABASE_URL` and `db:migrate` reached the database. drizzle-kit warned that the serverless driver connects over websockets. Stage 2 should point migrations at `DATABASE_URL_UNPOOLED` (direct connection).
  - **First Vercel preview failed** (`No Output Directory named "public"`): the project was imported while `main` held only docs, so Vercel set the framework to "Other". Fixed with a committed `vercel.json` (`"framework": "nextjs"`) rather than a dashboard-only setting, so the config is versioned and reviewable.
  - **3 low-severity `npm audit` warnings** in `deepmerge`, used inside the shadcn CLI (dev tooling only). The only "fix" downgrades shadcn to 1.0, so they were left and noted.
- **What I learned:**
  - Plan first, then build: the AI's plan surfaced decisions (branch naming, placeholder page, safe `db:migrate`) before any code was written.
  - New framework versions change things (route type generation, ESLint without `next lint`), so reading the version-matched docs matters more than memory.
  - CI runs the same commands I run locally, so "works on my machine" turns into "works everywhere".
- **Raw log:** [docs/ai-logs/2026-10-28-stage-0.md](ai-logs/2026-10-28-stage-0.md) (exported before the final merge, so the merge itself is not in the raw log)

## 2026-10-29 — Stage 1: Design system & landing page

- **Goal:** Give the app its look and identity (colour tokens, fonts, logo, mascot, favicon, theme and sound toggles, header, mobile tab bar, footer) and build the full landing page, tested on phone and desktop.
- **Key prompts I gave:**
  - The Stage 1 master prompt from `MASTER_PROMPT.md` (plan first, wait for "go").
  - Chose "Espresso text on gold" when the AI flagged that white text on Hermes gold fails WCAG AA.
  - Approved the plan.
- **What the AI did:**
  - Read the plan sections and the Next.js 16 docs for fonts and app icons, then wrote a plan in plan mode.
  - Found a conflict in `PLAN.md`: white on `#B8892E` is about 3.1:1, but the plan requires AA everywhere. It asked me instead of guessing.
  - Built tokens in `globals.css` (brand names plus shadcn aliases), fonts, theme provider and toggle, `useSound` hook, logo, mascot, app icons, header, tab bar, footer, landing sections and `formatPeso` / `formatTime`.
  - Used CSS keyframes for the cup animations instead of adding Motion now, so the landing page ships no extra JavaScript (Motion comes in Stage 4).
  - Took Playwright screenshots at 375px and 1280px in light and dark to check the layout itself, and fixed what it saw.
  - Wrote unit tests and Playwright checks, ran lint, format, typecheck, coverage, build and E2E, then committed in small prefixed commits.
- **What I reviewed / changed / rejected and why:**
  - Picked espresso text on gold buttons, keeping the exact brand gold.
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **AA contrast conflict in the plan:** resolved with espresso `primary-foreground`; `PLAN.md` updated.
  - **Name clash:** PLAN's `muted` is a text colour, but shadcn uses `muted` as a background. Mapped PLAN's `muted` to `muted-foreground` and documented the mapping in `ARCHITECTURE.md`.
  - **"Sign in" and cart showed on mobile:** the button styles set `inline-flex`, which overrode `hidden`. Fixed by wrapping desktop-only items in a `hidden md:flex` container. Caught from the screenshots, not the tests.
  - **`new Date()` in the footer** would break static prerendering with Cache Components. The footer now shows "© Hermes Express" without a year, as in the plan.
  - **No `user-event` package:** tests use `fireEvent` instead of adding a dependency.
  - **A commit picked up unrelated staged deletions:** the AI rebuilt the unpushed branch commits so each one holds one logical change.
- **What I learned:**
  - Design tokens let one class (`bg-surface`) work in both themes, so dark mode is mostly free once tokens exist.
  - Brand colours still need contrast checks; a "nice" palette can fail accessibility.
  - Hydration matters: the theme icon swaps through CSS (`dark:`) so server and browser render the same HTML.
  - Screenshots catch layout bugs that tests miss.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-1.md](ai-logs/2026-10-29-stage-1.md) (exported before the merge, so the merge itself is not in the raw log)

## 2026-10-29 — Stage 2: Accounts, roles & protected routes

- **Goal:** Add email + password accounts, the customer / barista / admin roles, protected pages, rate-limited auth, a header account menu, a profile page, and seed the branches and staff accounts.
- **Key prompts I gave:**
  - The Stage 2 master prompt (Better Auth + Drizzle, user fields, `/signup` and `/login`, middleware + `requireRole()`, rate limiting, account menu, `/profile`, seed part 1, migration, tests, ADR). Plan first and wait for "go".
  - "go", with answers to the AI's four questions: (1) the database E2E test skips without `DATABASE_URL`, plus a TODO for a Neon `ci` branch before Stage 5; (2) add the `vercel.json` build command that migrates first; (3) **changed** the proposal: no shared barista password; each barista gets their own variable, minimum 8 characters, and the seed fails clearly otherwise; (4) secrets go in `.env.local`, plus a table of what to add in Vercel.
  - "Never print passwords or connection strings in the chat" (repeated in later prompts).
  - After the PR: set my own seed passwords, then asked for a separate `dev` database, an E2E safety check against production, and fixes for the risks the AI listed before going live.
  - Chose an opt-in `--reset-passwords` seed option and demoting (not deleting) the old admin.
- **What the AI did:**
  - Read the Next.js 16 docs bundled in `node_modules` and found that middleware is now called `proxy.ts`, and that Cache Components need session reads inside `<Suspense>`.
  - Read Better Auth's source for its rate limiter and found that it only covers `/api/auth/*`, not server-side calls. It wrote one Postgres limiter (an atomic upsert) and used it for both our server actions and Better Auth.
  - Wrote the schema (6 new tables), generated and applied the migration, and seeded 3 branches, 1 admin and 3 baristas on Neon.
  - Built the forms as server actions with Zod, the profile page, staff placeholders and the account menu. Wrote unit tests (100% on the new `lib` / `server` code) and E2E tests.
  - Ran lint, format, typecheck, coverage, build and E2E, both with the database and without it (as in CI).
  - After the PR:
    - Found that a re-run seed doesn't apply changed passwords (by design) and that changing `SEED_ADMIN_EMAIL` left two admins. Added `--reset-passwords` and demoted the old admin.
    - Deleted 23 E2E test accounts from the production database (counts only shown).
    - Used the Neon CLI to create a `dev` branch for local work, wrote its connection strings into `.env.local` without printing them, and added `e2e/global-setup.ts`, which refuses to run E2E tests against the production branch.
    - Proved which database the preview uses with a harmless fake login: the rate-limit counter rose only on `preview/stage-2-auth`.
    - Gave me `vercel env add` commands to run myself (its own attempt was blocked by Claude Code's safety check), so secrets went straight into Vercel without being printed.
    - Listed risks before going live, then fixed three: "coming soon" pages for Orders/Rewards/Favorites/Checkout, a looser per-IP limit (30/min) with 5/min per email for shared mobile IPs, and removal of 17 leftover production variables from `.env.local`.
    - Scanned the exported chat log for secrets before committing it.
- **What I reviewed / changed / rejected and why:**
  - Rejected one shared barista password: separate passwords per branch are safer, and losing one doesn't expose the others.
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **E2E URL check passed too early:** `/profile$/` also matched `/signup?next=/profile`. The test now compares the exact path.
  - **Two `alert`s on the page:** Next.js adds a hidden route announcer with `role="alert"`; the test filters by text.
  - **Flaky E2E runs:** a dev server left over from an earlier session was still running on port 3100. After stopping it, the tests were checked against the production build, as CI does.
  - **Our own rate limiter blocked the second E2E run:** locally every request shares one IP bucket. The test now sends a random test IP header. This also showed the limiter works.
  - **"fetch() rejects when the prerender is complete" log on `/profile`:** the session read started during Next's prefetch prerender. Added `connection()` so session reads only happen for a real request.
  - **APIError without a code** was rethrown as a crash. It now shows a general friendly message, while non-auth errors still surface.
  - **Wrong conclusion about the preview database:** `vercel env pull` showed main's URL for Preview, so the AI first said the preview used main. The Neon CLI showed per-PR branches, and a fake-login test proved the preview uses its own branch (the integration injects it at build time). The AI corrected itself.
  - **Local dev and E2E were writing to production:** `.env.local` (from `vercel env pull`) pointed at main. Fixed with the `dev` branch and the E2E safety check; `docs/SETUP.md` now warns that `vercel env pull` overwrites `.env.local`.
  - **A secret was printed in the chat:** `vercel curl` printed debug output including a Deployment Protection bypass value. I regenerated it in Vercel; the old value no longer works.
  - **Production showed 404 on `/login`:** not a bug. Production follows `main`, which was still Stage 1 until this PR was merged.
- **What I learned:**
  - A cookie check in the proxy is only a fast first filter; the real authorization has to happen on the server for every page and action.
  - In-memory rate limits don't work on serverless, because each instance has its own memory.
  - With Partial Prerendering, anything per user (like the session) must sit inside `<Suspense>` so the rest of the page can still be static.
  - Each environment needs its own database; tests should never touch production, and a code-level safety check is more reliable than remembering.
  - Pulled environment files can quietly point a local machine at production.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-2.md](ai-logs/2026-10-29-stage-2.md) (exported before the merge, so the merge and production check are not in it)

## 2026-10-29 — Stage 3: Catalog, pricing & menu

- **Goal:** Add the catalog tables and seed the full PLAN §6 menu, build the pure pricing library (100% tested), the shared `DrinkConfig` schema, the `/menu` page with per-branch sold-out states, and replace the landing page's placeholder drinks with real ones.
- **Key prompts I gave:**
  - The Stage 3 master prompt (tables, seed with colours, `money.ts`, `pricing.ts`, `DrinkConfig`, `/menu` with a branch picker cookie, landing drinks, tests, closing block). Plan first and wait for "go".
  - Answers to the AI's four questions: (1) a customized signature costs its menu price plus the changes; (2) an additive `included_shots` column plus a `shot` ingredient for the ₱40 extra shot; (3) seed the catalog in the Vercel build; (4) after asking "can I change it later on?", yes to demo seasonal and sold-out items.
  - "Briefly summarize what this means, give me key points", then "go".
  - Follow-ups after the PR opened: add a fitting photo to every drink, pastry and snack (I chose real photos over drawn illustrations); add frappes, cold brews and hot brews with photos; fix the delay when switching branches; plan a receipt (shop name, branch address, phone, TIN, VAT line, its own tab, PDF download, emailed to an address entered at checkout).
- **What the AI did:**
  - Spotted that two signature prices in the plan (Olympus Latte, Ambrosia Matcha) are ₱5 below the sum of their recipes, and asked how to price them once customized, instead of guessing.
  - Added the 4 tables in one additive migration, checked that `.env.local` points at the Neon **dev** branch (not production) before applying it, then seeded and re-ran the seed to prove it adds nothing twice.
  - Wrote `calculateDrinkPrice()` and `calculateCartTotals()` as pure functions with 66 tests (100% coverage), and a seed-data test that prices every signature with the real function.
  - Built `/menu` with a no-JavaScript branch picker (three submit buttons, `aria-pressed`), seasonal and sold-out labels, and a polite message if the database is down.
  - Built once without a database (as CI does) to prove the pages don't need one at build time, ran E2E against the dev database, and checked screenshots at 375px and 1280px in light and dark mode.
  - Found 23 free-licence photos on Wikimedia Commons, looked at every candidate on contact sheets, and rejected ones that didn't match (an ensaymada without cheese, a mocha without whipped cream) or that showed another brand's logo. Cropped one photo to a single drink, and credited every photographer on a new `/credits` page.
  - Proposed seven new drinks built only from existing ingredients and priced at the sum of their parts, and grouped the menu into Hot drinks, Iced drinks and Frappes.
  - Made branch switching instant: the page now carries every branch's sold-out list, so a click changes the labels in the browser with no server request (an E2E test checks that no request is made).
  - Explained that receipts need orders (Stage 5), so wrote the receipt spec into PLAN §7 and moved receipts and their email into Stage 5 instead of building a receipt with no data.
- **What I reviewed / changed / rejected and why:**
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **Placeholder data test:** the landing test counted two "₱175" prices in the old placeholder file. It moved to `featured-drinks.test.tsx`, which checks the same thing against database-shaped data, so no check was dropped.
  - **Cache Components warning on `/menu`:** reading `new Date()` (for seasonal items) during prerendering is not allowed. Fixed with `await connection()`, so the menu part renders per request while the page shell stays prerendered.
  - **An impossible branch in pricing:** a fallback for "Zod error with no message" can never run, so it was removed instead of writing a fake test for it.
- **What I learned:**
  - A seed that only inserts missing rows is safe to run on every deploy; a seed that updates rows would undo the admin's price changes.
  - Pricing belongs in one pure function, so the live price in the browser and the real price on the server can never disagree.
  - With Partial Prerendering, anything that depends on the request (a cookie, the current time) goes inside `<Suspense>`.
  - "Free" photos still have rules: some licences require crediting the photographer.
  - Sending a little extra data with the page (three short sold-out lists) can remove a server round trip and make a button feel instant.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-3.md](ai-logs/2026-10-29-stage-3.md)

## 2026-10-29 — Stage 4: Coffee builder

- **Goal:** Build `/build`, the heart of the app: a six-step builder with a reducer-based state machine (undo, reset), an animated cup (pour, stack, mix, toppings, ice, steam), a live price bar, sold-out handling per branch, "Surprise me", prefill from a signature drink, and full keyboard and screen reader support.
- **Key prompts I gave:**
  - The Stage 4 master prompt (steps, state machine in `src/lib/builder/`, animated SVG cup with Motion, price bar, sold-out options, Surprise me, `?from=` and `?edit=`, layout, accessibility, tests, closing block). Plan first with a component tree and state design, and wait for "go".
  - Answers to the AI's three questions: switch the links to `?from=` but keep `?drink=` working; skip the build-a-drink E2E test without a database; Reset goes back to the starting drink and can be undone.
  - After the PR was open, three design changes, all added to PR #5 before merging:
    - "Please elevate the design for the toppings but not too heavy." When the AI proposed a light line-art refresh, I **corrected** it: "The problem here is that the toppings design are flat, I want it elevated."
    - "I want it when you are making the drink it will finish off at the brim of the cup."
    - "Make it so that the toppings and syrups don't have a limit", and the whipped cream was still below the brim, so fix that too.
  - Checked progress myself several times ("is it deployed?", "we are at stage 4, right?"), paused the session ("stop for now") and resumed it later.
- **What the AI did:**
  - Noticed that the Stage 3 links used `?drink=` while the prompt asked for `?from=`, and that Motion was planned but not installed, and raised both before coding.
  - Wrote the builder as a pure reducer with rules the UI can't bypass (no hot Cold Brew, shots only for espresso bases, and at first at most 3 syrups and 5 toppings, a limit removed later at my request), with 100% line coverage, including a test that the price after every action matches `calculateDrinkPrice()`.
  - Built the cup from pure helpers (layers, a height-weighted mixed colour, topping styles) so the drawing logic is tested without a browser, and timed the pour, stack and mix phases with a small state machine tested with fake timers.
  - Looked at screenshots at 375px and 1280px, in light and dark mode, and changed the phone layout because the cup scrolled out of view while choosing toppings: it is now a compact cup pinned under the header. Also shortened the step labels so all six fit at 375px.
  - Ran lint, typecheck, tests with coverage, the production build and the full E2E suite (desktop and phone).
  - After the PR:
    - **Toppings with depth:** moved the topping drawing into `builder-toppings.tsx` and added tested helpers in `visual.ts` (`shade()` for lighter and darker tones of each ingredient colour, `scatter()` for repeatable dust and crumbs, `toppingLayout()` for placement). Whipped cream is piped in tiers, foams are shaded domes with bubbles, sauces are glossy with drips that draw on, and pearls and jelly cubes are see-through and fall in one after another. No blur filters and no new colours, so it stays light and works in dark mode.
    - **Brim-full drink:** the base still pours to about half the cup, then once a milk is chosen the liquids rise to the rim, keeping their proportions. Foams finish at the brim and whipped cream sits on the rim.
    - **No limit on syrups or toppings:** each can be added once, the counter shows "N chosen", and the server keeps a hidden cap of 30 per list to reject junk requests. "Surprise me" still picks a modest number. PLAN §5 and §13 were updated with the decision.
    - Each change came with a short plan first, then screenshots in light and dark mode, the full checks, and a push to PR #5 so the preview updated.
- **What I reviewed / changed / rejected and why:**
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **Reduced motion was ignored in the browser:** `useReducedMotionConfig()` only reads `<MotionConfig>`, which defaults to "never". Seen in a dark-mode, reduced-motion screenshot ("Mix again" was showing). Fixed by also checking the device setting.
  - **Hydration mismatch from that fix:** the server can't know the device setting, so its HTML had "Mix again" and the browser's did not. Fixed by reading the setting only after hydration (`useSyncExternalStore`). A unit test for the device setting was dropped because Motion caches the setting once per page; an E2E test with reduced motion checks it in a real browser instead.
  - **Lint rule `react-hooks/immutability`:** a running total in the cup's render was flagged; moved into a pure, tested helper (`stackLayers()`).
  - **Forced clicks on hidden inputs** in the screenshot script landed under the pinned price bar; the tests click the visible option cards, as a customer would.
  - **Whipped cream sat below the rim:** it was placed on the drink's surface, which was 3% below the rim. It now sits on the rim line. The same screenshots showed a thin white strip under the rim, so the drink now fills right to the rim.
  - **Whipped cream above the rim nearly disappeared in light mode** against the cream page; it got a faint outline in a darker shade of the cream.
  - **Wrong expected price in a new test:** the AI added up the 11 toppings as ₱240 instead of ₱190. The test was corrected to ₱570; the app's price was right.
  - **An old test used "4 syrups" as an invalid drink,** which became valid once the limit was removed. It now uses a list over the 30-item safety cap.
  - **Two long builder tests timed out once** under the full parallel suite. Their timeout was raised to 15 seconds; what they check did not change.
  - **A shell command mangled backticks** in an edit before anything was written; the AI switched to its file-editing tool.
- **What I learned:**
  - Putting the rules in a reducer, not only in the buttons, means "Surprise me", undo and future features can't build an invalid drink.
  - Animations can be driven by a tiny state machine (pouring, stacked, mixing, mixed), which makes them testable with fake timers.
  - Anything that depends on the device (reduced motion, theme) must render the same as the server first, then update after hydration.
  - Looking at real screenshots catches problems tests don't, such as the cup scrolling out of view on a phone.
  - Being specific about what's wrong ("flat", not just "elevate it") gets a much better result than the first proposal.
  - A limit can be removed for customers while the server still keeps a safety cap, so the API stays protected.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-4.md](ai-logs/2026-10-29-stage-4.md) (exported before the merge of PR #5; checked for secrets before committing)

## 2026-10-29 — Stage 5: Cart, checkout & orders

- **Goal:** Let customers order: a cart (guest cart in the browser, merged into the account on login), Add to cart from `/menu` and `/build`, editing a cart drink in the builder, `/checkout` (pickup or delivery, Taguig/BGC address, ASAP or 15-minute slots, demo payment), a `placeOrder` server action that recomputes every price, the `order`, `order_item` and `order_status_event` tables, and a simple `/orders/[id]` page.
- **Key prompts I gave:**
  - The Stage 5 master prompt (cart, tables, checkout rules, demo payment, `placeOrder` re-validation and price recomputation, `HX-` codes, extension points for Stage 8, tests including tampered prices and an E2E, closing block with PR). Plan first and wait for "go".
  - "Sounds good you can go ahead and push it": accepting the AI's suggested answers to its four questions (receipts in a follow-up PR, I set up the CI database, a new `cart` table, Cash on Delivery for delivery only).
- **What the AI did:**
  - Noticed that `PLAN.md` puts receipts (tab, PDF, email, two new dependencies) in Stage 5 while my prompt did not, and that the "CI database before Stage 5" TODO was still open, and asked before coding.
  - Committed my Stage 4 raw log, branched from the updated `main`, and built in small commits: statuses, schedule slots, cart logic and validation, order lines and codes, the migration, the cart store and page, Add to cart, `placeOrder`, checkout, the order page, the E2E, then docs.
  - Kept all rules in pure, tested functions (`cart.ts`, `schedule.ts`, `orders.ts`, `order-status.ts`) and made the cart, checkout and server share them, so the price on screen and the price saved can't disagree.
  - Made `placeOrder` safe to repeat (one order per checkout via `clientRequestId`) and atomic (one `db.batch()`), and retried taken order codes.
  - Checked that `.env.local` pointed at the Neon dev branch (not production) before applying the migration there, then ran the full E2E suite against it on desktop and phone.
  - Ran lint, format check, typecheck, tests with coverage and the production build.
- **What I reviewed / changed / rejected and why:**
  - _(My own reflections: what I questioned, changed or rejected, and why.)_
- **Problems & fixes:**
  - **Build failed on the first page with an id in its URL** (`/orders/[id]`): with Cache Components, the nav's `usePathname()` outside `<Suspense>` blocks prerendering, because the URL is unknown at build time. Fixed (following the Next.js 16 docs) by reading the URL in a tiny `NavLink` per link inside its own `<Suspense>`.
  - **Cart state leaked between unit tests:** the store kept its parsed cart in memory while tests cleared `localStorage`. The store now re-reads whenever the stored text changes, which also makes it more robust in the app.
  - **Zod skips the delivery and payment rules while a basic field is invalid**, so the barangay error appears only after the phone is fixed. Kept as is (each error still shows), and the test was split into two cases.
  - **Tests that expected the Stage 4 "disabled" Add to cart** were updated to check the working buttons; the behaviour changed on purpose.
  - **The checkout's "Your order" box followed the scroll on laptops** (reported by me after testing): it was pinned with `md:sticky md:top-24`. Removed on checkout and, for consistency, on the cart's "Order summary".
  - **CI failed on the PR:** a new E2E expected "Your cart is empty." without a database, but CI has none, so `/cart` showed "Our menu is unavailable". It only passed locally because the dev database was connected. The no-database test now checks only the page heading, and the empty-cart check moved into the database-only group. Checked both ways locally (with and without `DATABASE_URL`).
  - **One existing E2E flaked once** when the dev server was still compiling `/build` under parallel load; it passed 8 out of 8 runs on its own. CI uses the production build, with retries.
- **What I learned:**
  - Store what the customer chose, not what it cost: prices are recomputed everywhere from one function, so a stale or tampered price never matters.
  - An idempotency key (one id per checkout) turns "the customer tapped Pay twice" from a bug into a non-event.
  - With Partial Prerendering, anything that reads the URL in a shared layout should sit in the smallest possible `<Suspense>` leaf.
- **Raw log:** [docs/ai-logs/2026-10-29-stage-5.md](ai-logs/2026-10-29-stage-5.md)
