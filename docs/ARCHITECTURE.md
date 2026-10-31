# Architecture

This is a short overview of how Hermes Express is built. The full product spec is in [`PLAN.md`](PLAN.md).

## System diagram

```mermaid
flowchart LR
  subgraph Client["Browser (phone or desktop)"]
    UI["React UI<br/>Server + Client Components"]
  end

  subgraph Vercel["Vercel (Next.js 16)"]
    RSC["Server Components<br/>(pages, data reads)"]
    SA["Server actions<br/>src/server/&lt;feature&gt;"]
    API["Route handlers<br/>src/app/api (auth, receipt PDF, polling)"]
    LIB["Pure business logic<br/>src/lib (pricing, points,<br/>promos, order-status)"]
    AUTH["Better Auth<br/>(sessions, roles)"]
  end

  DB[("Neon Postgres<br/>via Drizzle ORM")]
  MAIL["Resend<br/>(email receipts)"]

  UI -- "page requests" --> RSC
  UI -- "forms / mutations" --> SA
  UI -- "status polling (10s)" --> API
  RSC --> LIB
  SA --> LIB
  SA --> AUTH
  API --> AUTH
  RSC --> DB
  SA --> DB
  AUTH --> DB
  SA -. "on order placed" .-> MAIL

  subgraph Delivery["CI/CD"]
    GH["GitHub<br/>pull request"] --> CI["GitHub Actions<br/>lint, types, tests, build, E2E"]
    GH --> PREV["Vercel preview<br/>+ Neon preview branch"]
    MAIN["merge to main"] --> PROD["Vercel production"]
  end
```

## How a request flows

1. **Reading data:** a page is a **Server Component**. It reads from Postgres through Drizzle on the server and sends finished HTML to the browser. No database code ever reaches the browser.
2. **Changing data:** forms call a **server action** in `src/server/<feature>/`. Every action:
   1. checks the session, role, and (for baristas) branch
   2. validates the input with Zod
   3. uses pure functions from `src/lib` (for example `pricing.ts`) to compute the result
   4. writes to the database
3. **Signing in and roles** (details in [ADR 0002](decisions/0002-auth.md)):
   1. Login and sign-up forms call server actions in `src/server/auth/actions.ts`. Each one validates with Zod, checks the Postgres rate limiter (`src/server/rate-limit.ts`), then calls Better Auth, which sets an HTTP-only session cookie.
   2. `src/proxy.ts` (Next.js 16's name for middleware) runs before protected pages. No session cookie → redirect to `/login?next=…`. It only looks at the cookie.
   3. The page or action then calls `requireUser()` or `requireRole([...])` from `src/server/auth/session.ts`. These load the session from the database and check the role. This is the real security check.
   4. Which paths need which role is defined once in `src/lib/roles.ts`.
   5. The header reads the session inside `<Suspense>`, so the rest of every page can still be prerendered (Cache Components).
4. **Menu and prices** (Stage 3):
   1. `getCatalogSnapshot()` in `src/server/catalog/queries.ts` loads every ingredient, product and sold-out flag in one query batch. It is cached (`"use cache"`, tag `catalog`, up to an hour); admin edits in Stage 7 will refresh it with `updateTag("catalog")`.
   2. Pure functions in `src/lib/catalog.ts` turn the snapshot into the menu for one branch: hide inactive or out-of-season items, group by type, and mark items sold out. A signature drink is also sold out when an ingredient in its recipe is.
   3. The page sends every branch's sold-out list with the menu (`soldOutSlugsByBranch()`). The client component `MenuBrowser` swaps the "Sold out" labels the moment a branch is tapped, with no network request, and saves the choice in the `hx_menu_branch` cookie so the server renders the same branch after a reload. Before JavaScript loads, the buttons submit to the `selectBranch` server action instead (validated with Zod).
   4. Product photos live in `public/images/menu/<slug>.jpg`, are referenced by `product.image_url`, and are served through Next.js `<Image>`. Photographer credits are in `src/config/photo-credits.ts` and shown on `/credits`.
   5. `/menu` and the landing page read the database only at request time, inside `<Suspense>` after `connection()`. The page shell is still prerendered, and a build with no database (CI) works. If the database can't be reached, a polite message replaces the cards.
   6. `calculateDrinkPrice(config, catalog)` in `src/lib/pricing.ts` is the only price calculation. A drink built from scratch costs the sum of its parts. A customized signature costs its menu price plus the difference made by the changes, so an unchanged signature always costs its menu price. `calculateCartTotals()` adds lines, caps the discount and applies the ₱49 delivery fee (free from ₱800).
5. **Coffee builder** (Stage 4, `/build`):
   1. `BuilderContent` (a Server Component inside `<Suspense>`) loads the cached catalog snapshot, the branch cookie and the query string. `toBuilderCatalog()` in `src/lib/builder/catalog.ts` shapes the options for each step, and `soldOutIngredientsByBranch()` sends every branch's sold-out ingredients, so switching branches is instant like on `/menu`.
   2. `resolveBuilderStart()` (`src/lib/builder/start.ts`) picks the starting drink: a signature recipe for `?from=<slug>` (or the older `?drink=`), otherwise an empty cup. For `?edit=<cartItemId>` it only passes the id on: the cart lives in the browser, so `BuilderEntry` reads the item from it and opens that drink on its Review step, where "Update cart" replaces it in place.
   3. The client component `CoffeeBuilder` keeps everything in one `useReducer` built on `reduceBuilder()` (`src/lib/builder/state.ts`): the drink in progress, an undo stack (50 versions), the starting drink for Reset, the step and the quantity. Invalid changes (a hot Cold Brew, a fourth syrup) are ignored by the reducer, not just hidden in the UI.
   4. The live price is `calculateDrinkPrice()`, the same function the server will use at checkout, so the two can never disagree.
   5. `BuilderCup` draws the drink from pure helpers in `src/lib/builder/visual.ts` (layers, mixed colour, toppings, ice) and animates it with Motion: pour, stack, mix. With reduced motion it shows the finished drink.
   6. "Surprise me" uses `randomDrink()` (`src/lib/builder/random.ts`), which only picks options available at the branch.
6. **Cart, checkout and orders** (Stage 5, details in [ADR 0003](decisions/0003-cart-and-orders.md)):
   1. The cart is a small store in the browser (`src/components/cart/cart-store.ts`) on top of `localStorage` (key `hx_cart`), read with `useSyncExternalStore`, so the header badge, `/cart`, the builder and checkout all see the same cart, across tabs too. A cart item holds only _what_ was chosen (a product slug, or a `DrinkConfig`) and a quantity, never a price.
   2. `CartSessionSlot` (in the root layout, inside `<Suspense>`) tells the browser who is signed in. `CartAccountSync` then calls the `syncCart` server action: a guest's cart is merged into the account's saved cart (`cart` table, `mergeCarts()`), and a signed-in customer's later changes are saved with `saveCart` (debounced). After logging out, the account's cart is forgotten on that device.
   3. Prices are never stored: `priceCartItems()` (`src/lib/cart.ts`) prices every item at the chosen branch from the catalog with `calculateDrinkPrice()`, and flags items that are sold out, off the menu or no longer valid. `/cart`, `/checkout` and `placeOrder` all use it.
   4. `/checkout` (`CheckoutContent` → `CheckoutForm`) loads the catalog, the profile and each branch's ASAP status and slots (`src/lib/schedule.ts`, Manila time). The form checks itself with the same Zod schema as the server (`src/lib/validation/checkout.ts`), shows a demo payment screen, and calls `placeOrder`.
   5. `placeOrder` (`src/server/orders/actions.ts`): `requireUser()` → Zod → same checkout sent before? return that order → branch active and offering pickup or delivery → ASAP or slot valid now → `priceCartItems()` and `draftOrder()` (`src/lib/orders.ts`) recompute every price and refuse sold-out items → one `db.batch()` raises the branch's receipt counter (`branch.receipt_seq`) and saves `order` (with that counter as its `receipt_number`), `order_item` snapshots and the first `order_status_event` together (the Neon HTTP driver runs a batch as one transaction, and the counter update locks the branch row until it ends, so two orders never share a receipt number). A taken order code is retried with a new one. After the response, `after()` emails the receipt (see 7).
   6. `/orders/[id]` reads the order with `getOrderForUser()` (`src/server/orders/queries.ts`), which returns it only to its customer, a barista of its branch, or an admin. Status changes from Stage 6 on must pass `canTransition()` in `src/lib/order-status.ts`.
7. **Receipts** (Stage 5 follow-up, spec in PLAN §7 "Receipts"):
   1. `buildReceipt()` (`src/lib/receipt.ts`) turns a loaded order into one `Receipt`: the rows a printed PH sales receipt shows, top to bottom (header with branch address, phone and VAT REG TIN; details with the receipt number `HX-BGC-000123` from the branch `receiptCode` and the order's `receipt_number`; item lines; amounts; the total; the VAT breakdown from `vatFromTotal()` (VAT = total × 12/112, in centavos); payment; SOLD TO; footer). The page, the PDF and the email only lay these rows out, formatting amounts with `formatAmount()` and the total with `formatPesoPlain()`, so the three always match.
   2. `/receipts` lists the user's receipts (`listReceiptsForUser()`); `/receipts/[id]` shows one through `getOrderForUser()`, so the same people can see an order and its receipt.
   3. `GET /api/receipts/[id]/pdf` (`src/app/api/receipts/[id]/pdf/route.ts`) checks the session (401) and `getOrderForUser()` (404), then renders the PDF with `@react-pdf/renderer` (`src/server/receipts/pdf.tsx`). The PDF is an 80 mm roll (width only, so the height follows the content) in the built-in Courier font, with hyphenation turned off.
   4. `sendReceiptEmail()` (`src/server/receipts/email.ts`) runs in `after()` once per new order: it sends the HTML receipt with the PDF attached through Resend, to the checkout's receipt email, with an idempotency key per order. Without `RESEND_API_KEY` or `EMAIL_FROM` it is skipped; any error is logged (never the key or the address) and never affects the order.
8. **Live updates:** the order tracker and barista queue poll a route handler every 10 seconds. This is simpler than websockets and works well on serverless hosting (ADR coming in a later stage).

## Folder structure

```
src/
├─ app/          Routes (App Router). Pages, layouts, route handlers.
├─ components/   React components. ui/ = shadcn primitives, <feature>/ = feature components:
│  ├─ brand/     Logo mark, wordmark, Hermes mascot (one-colour SVG, currentColor).
│  ├─ layout/    Site header, desktop nav, mobile tab bar, footer, nav-items list.
│  ├─ landing/   Landing page sections (hero, how it works, featured, teaser, rewards, branches).
│  ├─ menu/      /menu: product cards, branch picker, sections, unavailable message.
│  ├─ builder/   /build: BuilderEntry, CoffeeBuilder, the animated cup, step panels (steps/), controls, price bar.
│  ├─ cart/      Browser cart store, account sync, header/tab badge, /cart view, Add to cart button.
│  ├─ checkout/  /checkout: form, choice cards, order summary, demo payment screen.
│  ├─ orders/    /orders/[id]: order details.
│  ├─ receipts/  /receipts and /receipts/[id]: receipt list, details and the receipt layout.
│  ├─ theme/     next-themes provider and the light/dark toggle.
│  ├─ sound/     Sound mute toggle (uses hooks/use-sound.ts).
│  ├─ auth/      Login and sign-up forms, labelled form field.
│  ├─ profile/   Profile edit form.
│  └─ staff/     Role-guarded placeholder for /barista and /admin.
├─ config/       site.ts: name, tagline, contacts, branches (single source of truth);
│                delivery-areas.ts: the Taguig barangays we deliver to.
├─ db/           Drizzle client (index.ts), schema.ts, migrations/, seed.ts, seed-env.ts,
│                catalog-data.ts (the PLAN §6 menu) and seed-catalog.ts (inserts missing rows only).
├─ lib/          Pure, framework-free business logic. Heavily unit tested (90% gate).
│  ├─ auth.ts    Better Auth setup (created lazily on first use).
│  ├─ roles.ts   Roles and which paths need which role.
│  ├─ money.ts   formatPeso(), formatAmount() and formatPesoPlain() (receipts) and centavo helpers.
│  ├─ pricing.ts calculateDrinkPrice() and calculateCartTotals() (100% tested).
│  ├─ catalog.ts Menu building, seasonal availability, sold-out rules.
│  ├─ cart.ts    Cart changes, guest/account merge, pricing a cart at a branch.
│  ├─ orders.ts  Order lines and totals from a priced cart; HX- order codes.
│  ├─ order-status.ts Order statuses and allowed transitions.
│  ├─ receipt.ts Receipt numbers, the VAT split and the Receipt shared by page, PDF and email.
│  ├─ schedule.ts ASAP and 15-minute slots within branch hours (Manila time).
│  ├─ builder/   Builder state machine (state.ts), start drink, random drink, cup visuals.
│  └─ validation/ Zod schemas (auth.ts: sign-up, login, profile, PH phone; drink.ts: DrinkConfig;
│                 cart.ts: cart items; checkout.ts: the checkout form and payment methods).
├─ server/       Server actions and queries grouped by feature (90% gate).
│  ├─ auth/      Session helpers (requireUser/requireRole) and auth actions.
│  ├─ catalog/   Cached catalog queries and the selectBranch action.
│  ├─ cart/      syncCart and saveCart (the signed-in customer's saved cart).
│  ├─ orders/    placeOrder action and order queries (including the receipts list).
│  ├─ receipts/  Receipt PDF (pdf.tsx) and receipt email (email.ts).
│  ├─ profile/   updateProfile action.
│  └─ rate-limit.ts Postgres fixed-window rate limiter.
├─ hooks/        Client-side React hooks.
├─ test/         Test helpers (catalog-fixture.ts: the seed menu as a catalog snapshot;
│                order-fixture.ts: loaded orders for receipt and order tests).
└─ proxy.ts      Cookie check that redirects signed-out visitors from protected pages.
e2e/             Playwright browser tests.
scripts/         Node scripts run by npm (db-migrate.ts, db-seed-catalog.ts).
docs/            Plan, architecture, setup, ADRs, AI logs.
```

## Design tokens

Colours are CSS variables in `src/app/globals.css`, defined once for light (`:root`) and once for dark (`.dark`, set by next-themes). `@theme inline` turns each one into a Tailwind colour, so `bg-surface` or `text-primary` works in both themes. Components never use raw hex values. The only exceptions are things drawn outside the page, where CSS variables do not exist: the apple icon, the receipt PDF and the receipt email. They copy the light-theme values from globals.css, with a comment saying so.

Brand tokens use the names from [`PLAN.md` §3](PLAN.md#color-palette--olympus-café): `background`, `surface`, `surface-muted`, `foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `success`, `danger`, `border`. shadcn/ui primitives expect their own names, so those are aliases:

| shadcn/ui name       | Points to                | Note                                         |
| -------------------- | ------------------------ | -------------------------------------------- |
| `card`, `popover`    | `surface`                |                                              |
| `muted`, `secondary` | `surface-muted`          | shadcn uses `muted` as a background colour   |
| `muted-foreground`   | PLAN's `muted` text tone | so secondary text is `text-muted-foreground` |
| `input`              | `border`                 |                                              |
| `destructive`        | `danger`                 |                                              |
| `ring`               | `accent`                 | Aegean blue focus outline                    |

Illustration colours (`coffee-espresso`, `coffee-latte`, `coffee-milk`, `coffee-foam`) are tokens too. Fonts: `font-sans` is Inter (body) and `font-heading` is Nunito (h1–h4), both loaded with `next/font`.

Animations are CSS keyframes (`hx-*` in `globals.css`). Each illustration's resting state is the finished drink, and `prefers-reduced-motion: reduce` turns all animations off.

## Key rules

| Rule                                                            | Why                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Money is integer centavos** (`15000` = ₱150)                  | Avoids floating-point rounding errors. Formatted only in the UI.          |
| **The server recomputes every price** with `src/lib/pricing.ts` | Never trust a total sent by the browser.                                  |
| **Order status changes go through `src/lib/order-status.ts`**   | One place defines the allowed transitions, and invalid ones are rejected. |
| **Authorization on the server** for every action                | Hiding a button is not security.                                          |
| **Order items snapshot their config and prices**                | Later menu edits don't change past orders.                                |
| **Server Components by default**                                | Less JavaScript in the browser; `"use client"` only for interaction.      |
| **Brand text and branches come from `src/config/site.ts`**      | Change them once, and every page updates.                                 |

## Data model

Tables are added stage by stage (users and auth in Stage 2, catalog in Stage 3, orders in Stage 5, rewards in Stage 8). The planned model is in [`PLAN.md` §9](PLAN.md#data-model-drizzle--postgres). Tables so far:

```mermaid
erDiagram
  branch ||--o{ user : "baristas work at"
  user ||--o{ session : has
  user ||--o{ account : "logs in with"
  branch {
    text id PK
    text slug UK
    text name
    text address
    text opens_at
    text closes_at
    boolean is_active
  }
  user {
    text id PK
    text email UK
    text name
    text phone "+639XXXXXXXXX"
    text role "customer | barista | admin"
    text branch_id FK "baristas only"
    int points_balance
    text default_address
  }
  session {
    text id PK
    text token UK
    text user_id FK
    timestamp expires_at
  }
  account {
    text id PK
    text user_id FK
    text provider_id "credential"
    text password "scrypt hash"
  }
  verification {
    text id PK
    text identifier
  }
  rate_limit {
    text key PK
    int count
    bigint window_start
  }
  branch ||--o{ branch_stock : "sold-out flags"
  ingredient ||--o{ branch_stock : "flagged in"
  product ||--o{ branch_stock : "flagged in"
  ingredient {
    text id PK
    text kind "size | temperature | base | milk | syrup | topping | shot"
    text slug UK
    int price_centavos
    text color "#RRGGBB, builder layer"
    int included_shots "espresso bases only"
    boolean is_active
  }
  product {
    text id PK
    text type "signature | pastry | snack"
    text slug UK
    int price_centavos
    jsonb recipe "DrinkConfig, signatures only"
    boolean is_seasonal
    timestamp available_from
    timestamp available_to
  }
  branch_stock {
    text id PK
    text branch_id FK
    text ingredient_id FK "exactly one of these two"
    text product_id FK
    boolean is_sold_out
  }
  promo_code {
    text id PK
    text code UK
    text type "percent | fixed"
    int value
    int max_discount_centavos
    int min_subtotal_centavos
    boolean first_order_only
    timestamp starts_at
    timestamp ends_at
  }
  user ||--o| cart : "saved cart"
  user ||--o{ order : places
  branch ||--o{ order : "made at"
  order ||--o{ order_item : contains
  order ||--o{ order_status_event : "status history"
  product ||--o{ order_item : "snapshot of"
  promo_code ||--o{ order : "Stage 8"
  cart {
    text user_id PK
    jsonb items "choices and quantities, never prices"
  }
  order {
    text id PK
    text code UK "HX-7K2P"
    text user_id FK
    text branch_id FK
    text fulfillment "pickup | delivery"
    text status "received → brewing → ready_for_pickup | out_for_delivery → completed, or cancelled"
    timestamp scheduled_for "null = ASAP"
    text contact_name
    text phone
    text receipt_email
    text address "delivery only"
    int subtotal_centavos
    int discount_centavos
    int delivery_fee_centavos
    int points_redeemed
    int total_centavos
    text payment_method "gcash_demo | card_demo | cod"
    text payment_status "demo_paid | unpaid"
    text client_request_id UK "one order per checkout"
  }
  order_item {
    text id PK
    text order_id FK
    text kind "custom | product"
    text product_id FK "product or the signature it started from"
    text name
    jsonb config "snapshot: drink and its choices"
    int unit_price_centavos
    int quantity
    int line_total_centavos
  }
  order_status_event {
    text id PK
    text order_id FK
    text status
    text changed_by_user_id FK
  }
```

## Environments

| Environment | Trigger            | Database                                   |
| ----------- | ------------------ | ------------------------------------------ |
| Local       | `npm run dev`      | Neon dev branch (via `.env.local`)         |
| Preview     | Every pull request | Neon preview branch, created automatically |
| Production  | Merge to `main`    | Neon main branch                           |

## Notes for AI agents

`AGENTS.md` is generated by Next.js. It tells coding agents to read the version-matched docs in `node_modules/next/dist/docs/`, because Next.js 16 APIs differ from older versions. Project rules are in `CLAUDE.md`.

## Decisions

Architecture decisions are recorded in [`decisions/`](decisions/):

- [0001: Tech stack](decisions/0001-tech-stack.md)
- [0002: Authentication and authorization](decisions/0002-auth.md)
- [0003: Cart storage and placing orders](decisions/0003-cart-and-orders.md)
