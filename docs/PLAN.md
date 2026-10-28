# Hermes Express — Project Plan & Architecture

> **Tagline:** *Brewed by you. Delivered by Hermes.*
>
> A coffee-ordering web app where customers build their own drink step by step, like a game, then have it delivered or pick it up at a branch.
> Built solo for the NYHA Junior Dev Hackathon.

---

## 1. Goals

1. Make ordering coffee feel like **crafting** something: a cup that fills, layers that stack, a drink that mixes.
2. Keep it **cozy, clean and formal**, with a subtle Greek-mythology (Hermes) identity.
3. Work equally well on **phone and desktop**. On phone it should feel like a native app.
4. Follow industry-standard practices: Git, CI/CD, tests, docs, safe deploys.

**Inspiration:** the ZUS Coffee app's flow (browse → customise → cart → track). This is an original web app; no ZUS branding, assets or copy are used.

---

## 2. Scope & priorities

The hackathon is a 1-week run. Build in priority order so there is always a working, deployed app.

| Priority | Meaning | Features |
|---|---|---|
| **P0** | Must ship first | Project setup, CI/CD, deploy, auth + roles, landing page, menu, coffee builder (pour / stack / mix, live price, undo), cart, checkout with demo payment, order tracking, barista order queue, admin menu & prices, sold-out toggle |
| **P1** | Core experience | Favorites & one-tap reorder, order history, loyalty points (earn + redeem), promo codes, ratings, scheduled orders, email receipts, badges, sound effects + mute, "Surprise me" |
| **P2** | Polish | Perfect-pour mini-game, sales dashboard charts, admin edit of customer profiles, extra animations, performance tuning |

---

## 3. Brand & identity

### Name, logo, mascot
- **Name:** Hermes Express
- **Logo:** an original, minimalist SVG made of a single-line **winged coffee cup** (a cup with one small wing, a nod to Hermes' winged sandals and helmet). It works in one color. Wordmark: "Hermes Express" in the heading font.
- **Mascot:** "Hermes", a minimalist line-art profile with a winged helmet. Used sparingly: the empty cart, order tracker, 404 page, and builder hints.
- **Favicon / app icon:** the winged cup mark.

### Voice
Formal, warm and concise. Examples:
- "Welcome to Hermes Express. What shall we prepare for you today?"
- "Your order has been received. Hermes is on his way."
- No slang, no emoji in UI copy.

### Color palette — "Olympus Café"
Cozy coffee neutrals, with **gold** (Hermes' winged sandals) as the primary accent and **Aegean blue** as the secondary.

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FAF6EF` (cream) | `#14110F` (night roast) | Page background |
| `surface` | `#FFFFFF` | `#1E1A17` | Cards, sheets |
| `surface-muted` | `#F1EBE1` (marble) | `#2A2420` | Inputs, chips |
| `foreground` | `#2B1E17` (espresso) | `#F3ECE2` | Main text |
| `muted` | `#7A6A5D` | `#A8998B` | Secondary text |
| `primary` | `#B8892E` (Hermes gold) | `#D4A853` | Buttons, highlights |
| `primary-foreground` | `#FFFFFF` | `#14110F` | Text on primary |
| `accent` | `#2F5D7C` (Aegean blue) | `#6FA3C7` | Links, badges, focus |
| `success` | `#3F7D58` | `#6BBF8A` | Status: ready / completed |
| `danger` | `#B2453A` | `#E07A6F` | Errors, sold out |
| `border` | `#E5DCCF` | `#3A322C` | Dividers |

All text/background pairs must pass **WCAG AA** contrast.
Theme: **light / dark toggle** (defaults to system, choice saved).

### Typography
- **Headings:** Nunito (rounded, friendly), weights 700–800
- **Body/UI:** Inter (clean, modern), weights 400–600
- Load both via `next/font`.

### Motion & sound
- **Motion:** subtle. Fades, gentle slides, a pour stream and mixing swirl in the builder. All motion respects `prefers-reduced-motion`.
- **Sound effects:** pour, soft clink (topping added), and a "ding" (order placed or status change). There's a mute toggle in the header, saved in localStorage. No background music.

---

## 4. Pages & navigation

### Navigation
- **Desktop:** top bar with logo, Home, Menu, Build Your Drink, Rewards, then cart icon, sound toggle, theme toggle, account menu.
- **Mobile:** slim top bar (logo, sound, theme) plus a **bottom tab bar**: Home · Menu · **Build** (center, raised gold button) · Cart · Profile.

### Footer
- Instagram: **@jrcbrr_** (link to instagram.com/jrcbrr_)
- Phone: **0939 008 2560**
- Email: **johnrudolph2010@gmail.com**
- Branch list with hours
- © Hermes Express. "Demo project — payments are simulated."

Contact details live in one config file (`src/config/site.ts`) so they're easy to change.

### Page map

| Route | Who | Purpose |
|---|---|---|
| `/` | Everyone | Landing page |
| `/menu` | Everyone | Ready-made signature drinks, pastries & snacks |
| `/build` | Everyone (login needed only to order) | Coffee builder |
| `/login`, `/signup` | Guests | Email + password auth |
| `/cart` | Customer | Review and edit cart |
| `/checkout` | Customer | Details, pickup/delivery, schedule, promo, points, demo payment |
| `/orders` | Customer | Order history |
| `/orders/[id]` | Customer | Live animated tracker, receipt, rating |
| `/favorites` | Customer | Saved drinks, one-tap reorder |
| `/rewards` | Customer | Points balance, redeemable drinks, badges |
| `/profile` | Customer | Name, phone, default address, password |
| `/barista` | Barista | Live order queue for their branch |
| `/barista/stock` | Barista | Sold-out toggles for their branch |
| `/admin` | Admin | Sales dashboard |
| `/admin/orders` | Admin | All orders, all branches, update status |
| `/admin/menu` | Admin | Products: add / edit / price / seasonal / hide |
| `/admin/ingredients` | Admin | Builder options and prices |
| `/admin/promos` | Admin | Promo codes |
| `/admin/customers` (+ `/[id]`) | Admin | View and edit customer profiles, adjust points |

### Landing page sections
1. **Hero:** headline "Brewed by you. Delivered by Hermes.", an animated cup filling, CTAs **Build Your Drink** and **View Menu**
2. **How it works:** 3 steps (Build → Order → Delivered or Pick up)
3. **Featured drinks:** 4–6 signature drinks, one tap to add or customise
4. **Builder teaser:** short looping preview of pour → stack → mix
5. **Rewards:** "Earn points with every cup"
6. **Branches:** the 3 branches with hours and services
7. **Footer**

---

## 5. Coffee Builder (the "game")

### Steps
`Cup → Base → Milk → Sweetener → Toppings → Review`

| Step | Controls |
|---|---|
| **Cup** | Size (12oz / 16oz / 22oz), temperature (Hot / Iced / Blended), ice level slider for iced (Light / Regular / Extra) |
| **Base** | Tap a base. Shots stepper (1–4) for espresso-based drinks |
| **Milk** | Tap a milk. Amount slider (Light / Regular / Extra) |
| **Sweetener** | Sweetness slider 0 / 25 / 50 / 75 / 100%, plus tap-to-add syrups (max 3) |
| **Toppings** | Tap to add (max 5) |
| **Review** | Name your drink, summary, price, quantity, **Add to cart**, **Save to favorites** |

### Visuals
- A large SVG cup that sits beside the controls on desktop and above them on mobile.
- Each liquid **pours** in (an animated stream from the top) and settles as a **colored layer**, so layers visibly **stack**.
- When a second liquid is added (for example milk over espresso), a **Mix** step plays automatically after the pour: a swirl animation blends the layer colors into the final drink color. The customer can also tap "Mix" again.
- Toppings drop in on top (foam, drizzle lines, pearls at the bottom).
- Iced drinks show ice cubes; hot drinks show soft steam.
- Each ingredient has a `color` (hex) used for its layer.

### Controls & rules
- **Live price** shown in a sticky bar (with breakdown on tap).
- **Undo** (step history stack) and **Reset**.
- **Back/Next** between steps; progress indicator shows step name.
- **Surprise me:** builds a random but valid drink.
- **Perfect Pour mini-game (P2):** optional on the Base step. Hold to pour, release when the liquid reaches the gold line. No score; landing it unlocks the "Perfect Pour" badge. There is no timer pressure.
- Sold-out options are shown disabled with a "Sold out at this branch" label.
- Fully keyboard-operable, with labels for screen readers.

### Badges (no scores or levels)
| Badge | Unlock |
|---|---|
| First Sip | Place your first order |
| Regular | Place 5 orders |
| Master Barista | Build 10 custom drinks |
| Milk Explorer | Order with every milk type |
| Olympian Taste | Try every base |
| Perfect Pour | Win the mini-game |
| Early Bird | Order before 8:00 AM |
| Night Owl | Order after 9:00 PM |
| Named It | Name a custom drink |

---

## 6. Menu & pricing (PHP)

All prices are stored as **integer centavos** in the database and shown as `₱150`.

### Bases (price for a 12oz cup)
| Base | Price |
|---|---|
| Espresso | ₱90 |
| Americano | ₱110 |
| Drip Coffee | ₱100 |
| Cold Brew | ₱140 |
| Latte | ₱130 |
| Cappuccino | ₱130 |
| Flat White | ₱140 |
| Mocha | ₱150 |
| Spanish Latte | ₱150 |
| Matcha | ₱150 |
| Hojicha | ₱150 |
| Chai | ₱140 |
| Chocolate (non-coffee) | ₱130 |
| Strawberry Milk (non-coffee) | ₱130 |
| Ube Milk (non-coffee) | ₱140 |

### Modifiers
| Group | Options |
|---|---|
| Size | 12oz +₱0 · 16oz +₱20 · 22oz +₱40 |
| Temperature | Hot +₱0 · Iced +₱0 · Blended +₱20 |
| Extra shot | +₱40 each |
| Milk | Whole +₱0 · Skim +₱0 · None +₱0 · Soy +₱20 · Oat +₱30 · Almond +₱30 · Coconut +₱30 |
| Sweetness | 0 / 25 / 50 / 75 / 100% — free |
| Syrups (+₱20 each) | Vanilla, Caramel, Hazelnut, Salted Caramel, Brown Sugar, Honey, Cinnamon, Peppermint, Toffee, White Chocolate |
| Toppings | Whipped Cream +₱20 · Cold Foam +₱30 · Sea Salt Cream +₱35 · Caramel Drizzle +₱15 · Chocolate Drizzle +₱15 · Cookie Crumble +₱20 · Cinnamon Dust +₱0 · Cocoa Powder +₱0 · Tapioca Pearls +₱20 · Coffee Jelly +₱20 · Nata de Coco +₱15 |

### Signature drinks (ready-made menu)
| Drink | Recipe | Price (12oz) |
|---|---|---|
| Olympus Latte | Latte, oat milk, honey, cinnamon dust | ₱175 |
| Winged Mocha | Mocha, whole milk, whipped cream, chocolate drizzle | ₱185 |
| Caduceus Cold Brew | Cold brew, sea salt cream | ₱175 |
| Ambrosia Matcha | Matcha, oat milk, vanilla | ₱195 |
| Golden Sandal | Spanish latte, brown sugar, coffee jelly | ₱190 |
| Messenger Americano | Americano, extra shot | ₱150 |

Signature drinks can be added as-is or opened in the builder to customise.

### Pastries & snacks
| Item | Price |
|---|---|
| Butter Croissant | ₱95 |
| Pain au Chocolat | ₱110 |
| Cinnamon Roll | ₱120 |
| Banana Bread | ₱85 |
| Ensaymada | ₱75 |
| Ube Cheese Pandesal | ₱60 |
| Chocolate Chip Cookie | ₱65 |
| Blueberry Muffin | ₱90 |
| Ham & Cheese Croissant Sandwich | ₱160 |
| Chicken Pesto Panini | ₱180 |

Products can be marked **seasonal** (with available-from/to dates) or **sold out** per branch.

### Promo codes (seeded)
| Code | Effect |
|---|---|
| `FIRSTSIP` | ₱50 off your first order (min. ₱150) |
| `HERMES10` | 10% off, max ₱100 discount |
| `OLYMPUS20` | 20% off orders ₱500+ (time-limited) |

---

## 7. Ordering & delivery

### Branches
| Branch | Address label | Hours |
|---|---|---|
| Tipas | Lontoc St, Calzada, Tipas, Taguig | 7:00 AM – 10:00 PM |
| BGC | High Street Kiosk, Bonifacio Global City | 7:00 AM – 11:00 PM |
| Taguig Lakeshore | Lakeshore, Taguig | 7:00 AM – 10:00 PM |

### Flow
1. Customers can browse and build without an account. **Login is required to check out.**
2. Cart: multiple items, change quantity, **edit** a custom drink (reopens the builder), remove.
3. Checkout:
   - **Pickup** or **Delivery**
   - Branch (the customer picks the nearest branch)
   - Contact: name, phone (PH format `09XXXXXXXXX`), address (delivery only), note for the barista
   - **ASAP** or **Schedule for later** (15-minute slots within branch hours, up to 2 days ahead)
   - Promo code, and redeem points
   - **Demo payment:** choose "GCash (Demo)", "Card (Demo)" or "Cash on Delivery". A fake processing screen always succeeds. The UI clearly says no real payment is made.
4. Delivery fee: flat **₱49**, waived for orders ₱800+. Delivery is limited to Taguig/BGC (checked with a simple city/barangay field, no maps API).
5. **The server recomputes every price.** It never trusts the client total.

### Order statuses
`Received → Brewing → Ready for pickup | Out for delivery → Completed` (and `Cancelled`)

### Tracking (`/orders/[id]`)
- Animated progress: the Hermes mascot moves along the steps, the cup fills as it brews, and wings flap on "Out for delivery".
- Updates by polling every 10 seconds (no websockets; this keeps it serverless-friendly on Vercel).
- A "ding" plays on status change if sound is on.
- Receipt shown on screen, and emailed when the order is placed.
- After `Completed`: rate each drink 1–5 stars with an optional comment.

---

## 8. Accounts, rewards, staff

### Roles
| Role | Can do |
|---|---|
| `customer` | Order, track, favorites, history, rewards, rate, profile |
| `barista` | Assigned to one branch. See that branch's live queue, update status, toggle sold-out |
| `admin` | Everything: all orders, menu & ingredient prices, promos, sold-out, sales dashboard, view/edit customer profiles, adjust points, manage staff roles |

Role checks run **on the server** (middleware plus every server action / route handler).

### Loyalty points
- Earn **1 point per ₱10** spent (after discounts, excluding the delivery fee). Points are credited when an order is `Completed`.
- Redeem: **150 pts** = free 12oz signature drink or base drink; **250 pts** = free 16oz; **350 pts** = free 22oz (add-ons still charged).
- Every change is written to a points ledger (earn / redeem / admin adjustment).

### Favorites & history
- Save any custom drink with a name. Reorder in one tap (goes to the cart with current prices).
- Order history with status, items and a reorder button.

### Notifications
- Customer: tracker updates on screen plus an email receipt.
- Barista/admin: new orders appear in the queue with a toast and a "ding".

---

## 9. Technical architecture

### Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), latest stable** | Full-stack React, first-class on Vercel |
| Language | **TypeScript (strict)** | Catches bugs early; industry standard |
| Styling | **Tailwind CSS** | As requested; design tokens as CSS variables |
| UI primitives | shadcn/ui (Radix) | Accessible, unstyled-by-default components we own |
| Animation | Motion (Framer Motion) | Pour, stack, mix animations |
| Theme | next-themes | Light/dark toggle |
| Database | **Neon Postgres** (via the Vercel Marketplace) | Serverless Postgres; preview branches |
| ORM | Drizzle ORM + drizzle-kit | Type-safe SQL, versioned migrations |
| Auth | Better Auth (email + password) | Simple credentials auth with Drizzle adapter, sessions, roles |
| Validation | Zod | Shared validation for forms and server |
| Email | Resend | Order receipts (skipped gracefully if no API key) |
| Charts | Recharts | Admin sales dashboard |
| Unit/integration tests | Vitest + Testing Library | Fast, TS-native |
| E2E tests | Playwright | Real browser flows |
| Lint/format | ESLint + Prettier | Consistent code |
| CI | GitHub Actions | Lint, typecheck, test, build on every PR |
| Hosting/CD | **Vercel** | Preview deploy per PR, production on `main` |

### Folder structure
```
hermes-express/
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ PLAN.md            ← this file
│  ├─ ARCHITECTURE.md    ← diagrams, data flow, decisions
│  ├─ SETUP.md           ← how to run locally / deploy
│  ├─ AI_LOG.md          ← summary of every AI session
│  ├─ ai-logs/           ← exported Claude Code conversations
│  └─ decisions/         ← short ADRs (one file per big decision)
├─ e2e/                  ← Playwright tests
├─ public/               ← logo, icons, sounds
├─ src/
│  ├─ app/
│  │  ├─ (public)/       ← landing, menu, build, auth pages
│  │  ├─ (customer)/     ← cart, checkout, orders, favorites, rewards, profile
│  │  ├─ barista/
│  │  ├─ admin/
│  │  └─ api/            ← route handlers (auth, polling)
│  ├─ components/
│  │  ├─ ui/             ← shadcn primitives
│  │  ├─ layout/         ← header, footer, bottom tabs
│  │  ├─ builder/        ← cup, layers, steps, controls
│  │  └─ ...
│  ├─ config/site.ts     ← name, tagline, contacts, branches
│  ├─ db/
│  │  ├─ schema.ts
│  │  ├─ migrations/
│  │  └─ seed.ts
│  ├─ lib/
│  │  ├─ pricing.ts      ← pure price calculation (heavily tested)
│  │  ├─ points.ts
│  │  ├─ promos.ts
│  │  ├─ badges.ts
│  │  ├─ order-status.ts ← allowed status transitions
│  │  ├─ builder/        ← builder state machine, random drink
│  │  ├─ auth.ts
│  │  └─ validation/     ← Zod schemas
│  ├─ server/            ← server actions & queries, grouped by feature
│  └─ hooks/
├─ CLAUDE.md
├─ README.md
├─ CHANGELOG.md
└─ .env.example
```

### Data model (Drizzle / Postgres)
| Table | Key fields |
|---|---|
| `user` (+ Better Auth `session`, `account`, `verification`) | id, name, email, phone, role (`customer`/`barista`/`admin`), branchId (baristas), pointsBalance, defaultAddress |
| `branch` | id, slug, name, address, opensAt, closesAt, isActive |
| `ingredient` | id, kind (`size`/`temperature`/`base`/`milk`/`syrup`/`topping`), name, slug, priceCentavos, color, sortOrder, isActive |
| `product` | id, type (`signature`/`pastry`/`snack`), name, slug, description, priceCentavos, imageUrl, recipe (jsonb, signatures only), isSeasonal, availableFrom, availableTo, isActive |
| `branch_stock` | branchId, ingredientId?, productId?, isSoldOut |
| `saved_drink` | id, userId, name, config (jsonb), createdAt |
| `order` | id, code (e.g. `HX-7K2P`), userId, branchId, fulfillment (`pickup`/`delivery`), status, scheduledFor?, contactName, phone, address?, notes, subtotal, discount, deliveryFee, pointsRedeemed, total, promoCodeId?, paymentMethod, paymentStatus (`demo_paid`), createdAt, updatedAt |
| `order_item` | id, orderId, kind (`custom`/`product`), productId?, name, config (jsonb snapshot), unitPriceCentavos, quantity, lineTotalCentavos |
| `order_status_event` | id, orderId, status, changedByUserId, createdAt |
| `rating` | id, orderItemId, userId, stars, comment, createdAt |
| `promo_code` | id, code, type (`percent`/`fixed`), value, maxDiscount?, minSubtotal, firstOrderOnly, startsAt, endsAt, maxUses, usedCount, isActive |
| `points_ledger` | id, userId, delta, reason (`earn`/`redeem`/`admin_adjust`), orderId?, note, createdAt |
| `user_badge` | userId, badgeKey, earnedAt |
| `user_stat` | userId, customDrinksBuilt, basesTried (jsonb), milksTried (jsonb) |

Badge definitions live in code (`src/lib/badges.ts`), not in the DB.

### Key rules
- **Money:** integer centavos everywhere; format only in the UI.
- **Pricing:** one pure function, `calculateDrinkPrice(config, catalog)`, used by the client (live price) and the server (truth).
- **Status transitions:** defined in `order-status.ts`. Invalid transitions are rejected on the server.
- **Snapshots:** `order_item.config` and prices are copied at order time, so later menu edits don't change old orders.
- **Authorization:** every server action checks session + role + (for baristas) branch.

---

## 10. Quality, CI/CD & shipping safely

### Git workflow
- `main` is always deployable and is what's live in production.
- One short-lived branch per stage: `stage-0-setup`, `stage-1-design`, and so on.
- Open a Pull Request → CI must pass → check the Vercel preview → merge.
- Commit messages use simple prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `style:`, `refactor:`.
- Branch protection on `main`: PR required, CI must pass.

### CI (GitHub Actions, on every PR and push to `main`)
1. Install (`npm ci`)
2. Lint (`npm run lint`)
3. Typecheck (`npm run typecheck`)
4. Unit/integration tests with coverage (`npm run test:coverage`)
5. Build (`npm run build`)
6. E2E (Playwright) against the built app

### CD (Vercel)
- Every PR gets a **preview deployment** (staging) with its own **Neon preview branch** database.
- Merging to `main` deploys to **production** automatically.
- DB migrations run in the build step (`drizzle-kit migrate`). Migrations must be **additive** (no destructive changes without a migration plan).
- Rollback: use "Promote previous deployment" in Vercel.

### Testing
- **Coverage gate:** 90% lines on `src/lib/**` and `src/server/**` (business logic); 70% overall.
- Must-test logic: pricing, promo validation, points earn/redeem, status transitions, badge unlocking, delivery fee, schedule slots, role checks.
- Component tests: builder steps, cart, checkout form validation.
- E2E: sign up → build drink → checkout → track; barista updates status; admin edits a price.

### Security basics
- Secrets only in `.env.local` / Vercel env vars. `.env*` is git-ignored except `.env.example`.
- Passwords hashed by Better Auth. Rate limiting on auth routes.
- Zod validation on every input; server-side price recomputation.
- No real payment data is ever collected.

### Environment variables
| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection (auto-added by the Vercel integration) |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `BETTER_AUTH_URL` | App base URL |
| `RESEND_API_KEY` | Optional; emails are skipped if missing |
| `EMAIL_FROM` | Sender address |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First admin account |

---

## 11. Documentation (judging: team readiness)
| Doc | Contents |
|---|---|
| `README.md` | What it is, screenshots, live link, features, stack, quick start |
| `docs/PLAN.md` | This plan |
| `docs/ARCHITECTURE.md` | System diagram (Mermaid), data flow, data model diagram, key decisions |
| `docs/SETUP.md` | Local setup, env vars, DB, seeding, tests, deploy |
| `docs/decisions/` | Short ADRs, e.g. "Why Drizzle", "Polling over websockets", "Centavos for money" |
| `docs/AI_LOG.md` | One entry per AI session: goal, prompts, what AI did, what I changed or rejected, lessons |
| `docs/ai-logs/` | Raw exported Claude Code conversations |
| `CHANGELOG.md` | What changed in each stage/PR |
| `CONTRIBUTING.md` | Branching, commit style, how to run checks, PR checklist |
| `CLAUDE.md` | Rules for AI coding sessions |

---

## 12. Build stages (order of work)

| Stage | Branch | Delivers | Priority |
|---|---|---|---|
| 0 | `stage-0-setup` | Scaffold, tooling, CI, Vercel + Neon, docs skeleton | P0 |
| 1 | `stage-1-design` | Theme, colors, fonts, logo, header/footer/bottom tabs, landing page | P0 |
| 2 | `stage-2-auth` | Better Auth, roles, protected routes, seed admin/baristas | P0 |
| 3 | `stage-3-catalog` | Schema + seed for ingredients/products/branches, `/menu`, pricing lib | P0 |
| 4 | `stage-4-builder` | Coffee builder with pour/stack/mix, live price, undo/reset | P0 |
| 5 | `stage-5-checkout` | Cart, checkout, demo payment, order creation | P0 |
| 6 | `stage-6-tracking` | Tracker, barista queue, status updates, sold-out | P0 |
| 7 | `stage-7-admin` | Admin menu/ingredients/prices, orders, customers | P0/P2 |
| 8 | `stage-8-rewards` | Favorites, history, points, promos, ratings, badges, scheduling, emails, sounds, surprise me | P1 |
| 9 | `stage-9-polish` | Mini-game, sales charts, a11y/perf pass, full E2E, final docs | P2 |

---

## 13. Decisions made on the owner's behalf
| Topic | Decision |
|---|---|
| Logo | No existing logo, so an original minimalist winged-cup SVG will be designed |
| Tagline | "Brewed by you. Delivered by Hermes." |
| Colors | "Olympus Café": cream/espresso neutrals, Hermes gold primary, Aegean blue accent |
| Prices | Set to typical Metro Manila café prices (see §6) |
| Delivery | Flat ₱49 fee, free at ₱800+, Taguig/BGC only |
| Branches & Git | Branch-per-stage + PRs (needed for Vercel previews and for the Git judging criterion) |
| "Full coverage" | 90% on business logic + E2E on key flows (100% on UI code is not practical in one week) |
| TypeScript | Yes, strict mode |
