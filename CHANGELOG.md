# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each build stage from [`docs/PLAN.md` §12](docs/PLAN.md) gets its own section.

## [Unreleased]

### Stage 5 follow-up: Receipts (2026-10-30)

#### Added

- **Receipt numbers** per branch, e.g. `HX-BGC-000123`: each branch counts its own orders. Additive migration `0003_receipt_numbers` adds `branch.receipt_seq` and `order.receipt_number` (unique per branch) and numbers existing orders per branch, oldest first. `placeOrder` raises the counter and stores it on the order in the same transaction.
- `/receipts` lists the customer's receipts, newest first; `/receipts/[id]` shows one, laid out like a shop receipt: logo, shop name, the branch's address, phone and TIN; receipt number, order code, Manila date and time, pickup or delivery, ASAP or scheduled time, customer details and delivery address; items with their choices, quantity, unit price and amount; subtotal, discount (with promo code), delivery fee or "Free", total, VATable sales and 12% VAT (VAT = total × 12/112); payment method and status; thanks, tagline and "Demo receipt. Not an official receipt."
- **Download PDF**: `GET /api/receipts/[id]/pdf` builds the receipt PDF on the server (new dependency `@react-pdf/renderer`). Signed-out visitors get 401; someone else's or a missing order gets 404.
- **Receipt email**: after a new order is placed, the receipt (with the PDF attached) is emailed to the address given at checkout through Resend (new dependency `resend`). It runs after the response, so checkout is never slowed down, and is sent at most once per order. Without `RESEND_API_KEY` or `EMAIL_FROM` it is skipped and logged; errors are logged and never affect the order.
- `src/lib/receipt.ts`: `buildReceipt()`, `formatReceiptNumber()`, `vatFromTotal()`, `formatReceiptDateTime()`; the page, PDF and email all render the same receipt. `formatPesoPlain()` in `src/lib/money.ts` ("PHP 495.00") for the receipt total.
- `siteConfig.tin` (a random demo TIN, `301-707-321-000`, at the owner's request; not a real TIN) and a `receiptCode` per branch (`TIP`, `BGC`, `TLK`).
- Tests: receipt numbers, the VAT split and rounding, Manila dates, the receipt view, list and details, PDF rendering (one page per receipt), the PDF route's 401/404/200, the email (sent, skipped without configuration, Resend errors, thrown errors, HTML escaping, no secrets or addresses in logs), the counter update in `placeOrder`; the checkout E2E now opens the receipt, downloads the PDF and finds it under Receipts.

#### Changed

- The order page has a "View receipt" button.
- Receipts is in the desktop header and the account menu (so also on the Profile page on phones). The mobile bottom tabs are unchanged.
- **Formal receipt style** (owner request): the page, PDF and email now look like a printed Philippine sales receipt: monospaced, black on white, "SALES RECEIPT" and "VAT REG TIN" in the header, uppercase labels, plain amounts with "PHP" on TOTAL AMOUNT DUE, a VAT breakdown (VATable, VAT-exempt, zero-rated, VAT amount) and a SOLD TO block. Dates print as `10/30/2026 09:15 AM`. The PDF is an 80 mm receipt roll in Courier. New `formatAmount()` in `src/lib/money.ts`.
- `/receipts` needs a signed-in user, like the other customer pages (`src/lib/roles.ts`, `src/proxy.ts`).
- `getOrderForUser()` also returns the branch slug and the promo code.
- The Vitest setup skips its browser stubs in tests that use the Node environment (needed to render PDFs).

### Stage 5: Cart, checkout & orders (2026-10-29)

#### Added

- **Cart** (`/cart`, open to guests): every item with its choices, price, a quantity stepper (1–20), Edit for custom drinks (opens the builder at `/build?edit=<id>`, where "Update cart" changes the drink in place) and Remove. Subtotal, the delivery fee rule, and a branch picker that flags items sold out at the chosen branch and blocks checkout until they are fixed.
- The cart lives in the browser (`localStorage`, key `hx_cart`) and stays in step across tabs. Logging in merges a guest's cart into the account's saved cart (new `cart` table: choices only, never prices); a signed-in customer's changes are saved to the account shortly after each change; logging out forgets the account's cart on that device. The header and the mobile Cart tab show the number of items.
- **Add to cart** works on `/menu` (signature drinks, pastries and snacks; disabled when sold out at the branch) and in the builder's Review step, with an "Added to your cart" confirmation.
- **Checkout** (`/checkout`, login required): pickup or delivery; branch; name, mobile number and receipt email filled in from the profile; a Taguig delivery address (street and a barangay list, including Fort Bonifacio (BGC) and the EMBO barangays); a note for the barista; ASAP (only while the branch is open) or a 15-minute slot within branch hours, today and the next 2 days; GCash (Demo), Card (Demo) or Cash on Delivery (delivery only). Live totals with the ₱49 delivery fee, free from ₱800.
- A demo payment screen ("Processing your payment with GCash (Demo)…") that always succeeds. The checkout, the processing screen and the order page all say that no real payment is made.
- **`placeOrder` server action** (`src/server/orders/actions.ts`): checks the session, re-validates everything with Zod, ignores any price the browser sends and recomputes every price from the catalog, re-checks ASAP or the slot with the server's clock and the branch's hours, refuses items sold out at the branch or off the menu, snapshots each item (drink, choices, name, prices), and saves the order, its items and its first status (`Received`) in one batch with a short code such as `HX-7K2P`. The same checkout sent twice returns the same order.
- **Order page** `/orders/[id]`: code, status, branch, pickup or delivery, time, contact, items with their choices, totals and payment. Customers see only their own orders (baristas their branch's, admins all). The live tracker comes in Stage 6.
- Tables `order`, `order_item`, `order_status_event` and `cart` (additive migration `0002_orders_and_cart`).
- Pure, tested logic: `src/lib/cart.ts` (cart changes, merge, pricing per branch), `src/lib/schedule.ts` (slots and ASAP in Manila time), `src/lib/orders.ts` (order lines, totals, order codes), `src/lib/order-status.ts` (statuses and allowed transitions), `src/lib/validation/cart.ts` and `checkout.ts`, and `src/config/delivery-areas.ts`.
- Extension points for Stage 8: `draftOrder()` takes a discount, the order already has `discount_centavos`, `points_redeemed` and `promo_code_id`, and the checkout schema and summary mark where promo codes and points go.
- Tests: cart, schedule slots, delivery fee boundary, order lines and codes, status transitions, checkout validation, `placeOrder` (including tampered client prices being ignored, sold-out items, closed branches, past slots, code collisions and repeated checkouts), `syncCart`/`saveCart`, order queries and permissions; component tests for the cart, checkout and order page; an E2E for build → cart → sign up → checkout → order created.

#### Changed

- The menu's "Online ordering opens soon" note and the builder's disabled "Add to cart" are gone; their tests now check the working buttons.
- The desktop nav and mobile tab bar read the current URL inside a small `<Suspense>` per link, so pages with an id in the URL (such as `/orders/[id]`) can still be prerendered with Cache Components.
- The cart's "Order summary" and the checkout's "Your order" box now scroll with the page on laptop screens instead of staying pinned beside the form (owner request).
- `personNameSchema`, `emailSchema` and `phoneSchema` are now exported from `src/lib/validation/auth.ts` for reuse at checkout.

#### Not in this stage

- Receipts (receipts tab, PDF download, email) follow in a separate PR right after this one (owner decision). The checkout already collects the receipt email.

### Stage 4: Coffee builder (2026-10-29)

#### Added

- `/build`: build a drink in six steps: Cup (size, temperature, ice slider for iced drinks), Base (with a 1–4 espresso shots stepper), Milk (with an amount slider), Sweetener (0–100% slider and any number of syrups), Toppings (any number) and Review (name, summary, quantity). "Add to cart" and "Save to favorites" are visible but disabled until Stages 5 and 8.
- An animated SVG cup (Motion): each new liquid pours in from the top and settles as a layer, layers stack, then a swirl mixes them into one colour ("Mix again" replays it). Toppings drop in (foam, drizzle, sprinkles, pearls and jelly at the bottom), iced drinks show ice, hot drinks steam, blended drinks look thicker. With reduced motion the finished drink is shown without animation.
- A live price bar with a tap-to-open breakdown, using `calculateDrinkPrice()`.
- Undo (50 steps; typing a name counts once) and Reset (back to the starting drink, and undoable).
- "Surprise me": a random drink made only from options available at the branch.
- Sold-out ingredients at the selected branch are disabled and labelled "Sold out at this branch"; Review warns if the drink uses one. The branch picker works like the one on `/menu`. Cold Brew can't be chosen hot.
- Open a signature drink in the builder with `/build?from=<slug>`. `?edit=<cartItemId>` shows a note until the cart arrives (Stage 5).
- Layout: cup on the left on desktop; on phones a compact cup stays pinned under the header, with the price and Back/Next pinned above the bottom tab bar.
- Keyboard and screen readers: native radio, checkbox and range inputs, focus moves to each new step's heading, and the drink and price are announced after each change.
- `src/lib/builder/`: the builder state machine (`state.ts`), `random.ts`, `visual.ts`, `catalog.ts` and `start.ts` (100% line coverage), and `soldOutIngredientsByBranch()` in `src/lib/catalog.ts`.
- Tests: reducer, undo/reset, step navigation, price updates, random drinks (500 seeded runs), cup visuals and start drink; component tests for the builder, its animation phases and the page; E2E that builds a drink step by step, opens a signature, follows the menu link, checks reduced motion and the phone layout.
- New dependency: `motion` (Motion), listed in PLAN §9 for the builder animations.

- The finished drink fills the cup to the brim: the base pours in to about half, and once a milk is chosen the liquids rise right to the rim, keeping their proportions (more milk or more shots take more of the cup). Foams finish at the brim, and whipped cream sits on the rim, above the cup.
- No limit on syrups or toppings: customers can add as many as they like (each once), and the counter shows how many are chosen. The syrup band at the bottom of the cup stays thin however many are added. The drink schema keeps a hidden safety cap of 30 per list, far above the number of options, to reject junk requests.
- Toppings with depth instead of flat shapes: whipped cream is piped in soft tiers with a curled tip, foams are shaded domes with tiny bubbles (and salt flecks on sea salt cream), sauces are glossy and drape with tapered drips (drawn on as they pour), cinnamon and cocoa are a fine dusting, cookie crumble has lit crumbs, pearls are glossy and jelly and nata de coco are see-through cubes that fall one after another. Each topping is shaded from its own ingredient colour, so it works in light and dark mode.

#### Changed

- The menu and landing "Customize" links now open `/build?from=<slug>` (was `?drink=`, which still works).

### Stage 3: Catalog, pricing & menu (2026-10-29)

#### Added

- Tables `ingredient`, `product`, `branch_stock` and `promo_code` (additive migration `0001_catalog`). `ingredient.included_shots` marks espresso-based bases; a check makes each `branch_stock` row point at exactly one ingredient or product.
- The full PLAN §6 menu as seed data (`src/db/catalog-data.ts`): 3 sizes, 3 temperatures, 15 bases, 7 milks, 10 syrups, 11 toppings, the extra shot, 6 signature drinks with recipes, 7 pastries, 3 snacks, and the promo codes `FIRSTSIP`, `HERMES10` and `OLYMPUS20`. Every liquid and topping has a colour for the Stage 4 builder.
- Demo states: Ube Cheese Pandesal is seasonal (Oct 1 – Dec 31, 2026) and Cinnamon Roll is sold out at BGC.
- `npm run db:seed:catalog`: seeds the menu only, needs no secrets, and inserts missing rows without changing existing ones. `npm run db:seed` runs it too.
- `src/lib/money.ts`: `formatPeso()` plus centavo helpers (`assertCentavos`, `pesosToCentavos`, `multiplyCentavos`, `percentOfCentavos`, `sumCentavos`).
- `src/lib/validation/drink.ts`: the shared `DrinkConfig` type and Zod schema (sizes, temperatures, ice level for iced drinks only, 1–4 shots, sweetness 0–100%, up to 3 syrups and 5 toppings with no repeats, optional name and signature).
- `src/lib/pricing.ts`: `calculateDrinkPrice(config, catalog)` with a line-by-line breakdown, and `calculateCartTotals()` (quantity 1–20, discount capped at the subtotal, ₱49 delivery free from ₱800). It rejects unknown, inactive or wrongly used ingredients, shots on non-espresso bases, and a hot Cold Brew. 100% unit-test coverage.
- `src/lib/catalog.ts`: menu building per branch, seasonal date windows, and sold-out rules (a signature is also sold out when a recipe ingredient is).
- Cached catalog queries (`src/server/catalog/queries.ts`, cache tag `catalog`) and a `selectBranch` server action that remembers the branch in the `hx_menu_branch` cookie.
- `/menu` page: Signature Drinks, Pastries and Snacks sections with jump links, a branch picker, prices, and "Seasonal" and "Sold out at this branch" labels. "Add to cart" is visible but disabled until Stage 5; "Customize" opens `/build?drink=<slug>` (the builder arrives in Stage 4).
- Seven more signature drinks: Pegasus Caramel Frappe, Titan Chocolate Frappe, Elysian Matcha Frappe, Nyx Black Cold Brew, Zephyr Foam Cold Brew, Hestia Hearth Brew and Apollo Morning Brew, each priced at the sum of its recipe. `/menu` groups signature drinks into Hot drinks, Iced drinks and Frappes, with jump links.
- A photo for every menu item (`public/images/menu/`, free-licence photos from Wikimedia Commons, checked to match each item) on `/menu` cards and the landing page's featured drinks. Sold-out items show a faded photo. Served through Next.js `<Image>`, so phones get smaller files.
- `/credits` page crediting each photographer and licence, linked from the footer.
- Tests: money, pricing, drink schema, catalog rules, seed data checked against PLAN §6 (including a photo file and credit for every product), catalog queries and branch action, menu components and page, landing featured drinks, credits page; E2E for the menu, drink groups, photos, the branch picker and sold-out labels (database parts skip without a database).

#### Fixed

- Switching branches on `/menu` is now instant. The page carries the sold-out list of every branch, so a click only re-labels the cards in the browser, with no trip to the server. The browser saves the choice in the `hx_menu_branch` cookie (no longer HTTP-only; it holds only a branch name). Before JavaScript loads, the buttons still work through the server action.

#### Changed

- The landing page's featured drinks now come from the database instead of placeholder data, and link to `/build?drink=<slug>`. "Customise" is now spelled "Customize" to match the menu.
- `formatPeso()` moved from `src/lib/format.ts` to `src/lib/money.ts`.
- The seed also fills a product's photo when it has none (it never replaces one that is set).
- `vercel.json` build command: `npm run db:migrate && npm run db:seed:catalog && npm run build`.
- `docs/PLAN.md` has a new "Decisions made by the owner (Stage 3)" table; `docs/ARCHITECTURE.md` and `docs/SETUP.md` describe the catalog flow, tables and seed command.

### Stage 2: Accounts, roles & protected routes (2026-10-29)

#### Added

- Email + password accounts with Better Auth (Drizzle adapter on Neon). Passwords are hashed; sessions are stored in Postgres.
- User fields `phone`, `role` (customer / barista / admin, default customer), `branchId`, `pointsBalance` and `defaultAddress`. Users cannot set their own role, branch or points.
- `/signup` and `/login` pages with Zod validation and formal, friendly error messages. Philippine mobile numbers in any common format are saved as `+639XXXXXXXXX`.
- `/profile` page to edit name, mobile number and default address, with shortcuts and log out (useful on phones).
- Header account menu: Log in / Sign up when signed out; Profile, Orders, Rewards, Log out when signed in; Barista and Admin links for those roles.
- `src/proxy.ts` sends signed-out visitors from checkout, orders, favorites, rewards, profile, `/barista` and `/admin` to login, and back afterwards.
- `requireUser()` / `requireRole()` server helpers; `/barista` (barista or admin) and `/admin` (admin) placeholder pages use them.
- Rate limiting on sign-up and login (5 per minute per email, 30 per minute per IP so customers sharing a mobile network IP aren't locked out), stored in Postgres; Better Auth's own endpoints use the same limiter.
- Tables `branch`, `user`, `session`, `account`, `verification`, `rate_limit` (migration `0000_auth_and_branches`).
- Seed script part 1: the 3 branches from `site.ts`, an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and one barista per branch, each with their own password variable. It stops with a clear error if a variable is missing or shorter than 8 characters. Pass `--reset-passwords` (`npm run db:seed -- --reset-passwords`) to apply changed seed passwords to existing staff accounts and sign them out; a normal run never overwrites passwords.
- `vercel.json` build command runs migrations before each build.
- Tests: roles, validation schemas, rate limiter, session helpers, auth and profile actions, proxy redirects, account menu, auth forms; E2E for protected-route redirects, form errors, and sign up → log out → log in (skips without a database).
- ADR [0002: Authentication and authorization](docs/decisions/0002-auth.md).

#### Changed

- The header's "Sign in" button is now the account menu ("Log in" and "Sign up" when signed out).
- New seed variables `SEED_BARISTA_TIPAS_PASSWORD`, `SEED_BARISTA_BGC_PASSWORD` and `SEED_BARISTA_LAKESHORE_PASSWORD` (placeholders in `.env.example`); there is no shared barista password.
- `docs/PLAN.md`, `docs/SETUP.md`: environment variables now say where each one is set. In Vercel, `BETTER_AUTH_SECRET` goes in Production and Preview, and `BETTER_AUTH_URL` in Production only; seed variables stay in `.env.local`.
- `docs/PLAN.md`: the proxy replaces "middleware", migrations run in the Vercel build command, rate-limit details, a rule that secret values are never printed, and a new "Decisions made by the owner (Stage 2)" table.

#### Databases

- Three separate Neon databases: `dev` (local work and E2E), `preview/<git-branch>` (one per PR, made by the Neon integration) and `main` (production only). `docs/SETUP.md` has a new "Databases" section explaining them.
- E2E safety check (`e2e/global-setup.ts`): Playwright refuses to run if `DATABASE_URL` points at the production branch.
- `docs/SETUP.md` no longer suggests `vercel env pull .env.local`, and warns that it overwrites `.env.local` with production values.

#### Fixed

- Orders, Rewards, Favorites and Checkout show a signed-in "coming soon" page instead of "page not found" (the account menu links to them).
- Removed leftover Vercel-pulled variables (`POSTGRES_*`, `PG*`, Neon Auth and realtime) from the local `.env.local`; they pointed at the production database and nothing uses them.

- 23 E2E test accounts that had been created in the production database (before the `dev` branch existed) were removed.

#### Known gaps

- CI has no database yet, so the sign up → log out → log in E2E test skips there. TODO before Stage 5: a Neon `ci` branch and a `DATABASE_URL` GitHub secret (steps in `docs/SETUP.md`).

### Stage 1: Design system & landing page (2026-10-29)

#### Added

- "Olympus Café" design tokens as CSS variables for light and dark, wired into Tailwind; shadcn/ui names alias the brand tokens.
- Light/dark theme toggle with `next-themes` (follows the system until the visitor chooses).
- Nunito (headings) and Inter (body) via `next/font`.
- Original one-colour SVG winged-cup logo, wordmark, and Hermes mascot (line-art profile with winged helmet).
- App icons from the logo mark: `icon.svg` favicon and a generated 180×180 `apple-icon`.
- Desktop top bar (Home, Menu, Build Your Drink, Rewards, cart, sound, theme, sign in).
- Mobile slim top bar and bottom tab bar (Home, Menu, raised gold Build button, Cart, Profile).
- Footer with contacts and branch hours from `src/config/site.ts`.
- Sound toggle and `useSound` hook. Mute is saved in localStorage; the sounds themselves arrive in Stage 8.
- Landing page: hero with a looping cup-filling animation, How it works, Featured drinks (placeholder data until Stage 3), builder teaser (pour, stack, mix), Rewards, Branches.
- `formatPeso()` and `formatTime()` helpers in `src/lib/format.ts`.
- Unit tests for the theme toggle, sound toggle, nav, footer, brand art and landing page; Playwright checks on desktop and 375px mobile (sections, nav per screen size, theme and mute persistence, reduced motion).

#### Changed

- Light-mode `primary-foreground` is espresso `#2B1E17` instead of white, so text on gold buttons passes WCAG AA. `docs/PLAN.md` is updated to match.
- Replaced the default Next.js favicon and the Geist fonts.
- All animations stop when the visitor prefers reduced motion.

### Stage 0: Project setup (2026-10-28)

#### Added

- Next.js 16 app (App Router, TypeScript strict, Tailwind CSS v4, ESLint, `src/` directory, `@/*` alias), pinned to Node 24.
- Prettier with Tailwind class sorting; shadcn/ui initialised.
- `src/config/site.ts` with name, tagline, contacts and the 3 branches.
- Placeholder home page showing the name and tagline.
- Vitest + Testing Library with coverage gates (90% `src/lib`, `src/server`; 70% overall) and sample tests.
- Playwright smoke test on desktop and 375px mobile.
- Drizzle ORM with the Neon serverless driver, an empty schema, and `db:generate` / `db:migrate` / `db:seed` scripts.
- `.env.example` documenting every environment variable.
- GitHub Actions CI: lint, format check, typecheck, tests with coverage, build, E2E.
- Pull request template.
- Docs: README, SETUP, ARCHITECTURE, CONTRIBUTING, AI_LOG, ADR 0001 (tech stack).
