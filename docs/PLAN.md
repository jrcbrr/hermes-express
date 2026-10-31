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
| `primary-foreground` | `#2B1E17` | `#14110F` | Text on primary (espresso, not white: white on gold is ~3.1:1 and fails AA) |
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
| `/receipts` | Customer | Every past receipt, newest first (header link on desktop; account menu and Profile on phones) |
| `/receipts/[id]` | Customer | One receipt, with "Download PDF" |
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
| **Sweetener** | Sweetness slider 0 / 25 / 50 / 75 / 100%, plus tap-to-add syrups (as many as you like, each once) |
| **Toppings** | Tap to add (as many as you like, each once) |
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
| Pegasus Caramel Frappe | Latte blended, whole milk, salted caramel, whipped cream, caramel drizzle | ₱205 |
| Titan Chocolate Frappe | Mocha blended, whole milk, whipped cream, chocolate drizzle | ₱205 |
| Elysian Matcha Frappe | Matcha blended, whole milk, vanilla, whipped cream | ₱210 |
| Nyx Black Cold Brew | Cold brew over ice, black, unsweetened | ₱140 |
| Zephyr Foam Cold Brew | Cold brew, vanilla, cold foam | ₱190 |
| Hestia Hearth Brew | Drip coffee, hot, black, unsweetened | ₱100 |
| Apollo Morning Brew | Drip coffee, hot, whole milk, honey | ₱120 |

Signature drinks can be added as-is or opened in the builder to customise. On `/menu` they are grouped into **Hot drinks**, **Iced drinks** and **Frappes** (from each recipe's temperature).

Every product has a photo (`public/images/menu/<slug>.jpg`, free-licence photos from Wikimedia Commons). Photographers are credited on `/credits`, linked from the footer.

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
   - **Demo payment:** choose "GCash (Demo)" or "Card (Demo)", or pay cash: "Cash at Pickup" for pickup, "Cash on Delivery" for delivery. A fake processing screen always succeeds. The UI clearly says no real payment is made.
4. Delivery fee: flat **₱49**, waived for orders ₱800+. Delivery is limited to Taguig/BGC (checked with a simple city/barangay field, no maps API).
5. **The server recomputes every price.** It never trusts the client total.

### Receipts (Stage 5)
Every order gets a receipt, laid out like a **printed Philippine sales receipt** (owner decision): one monospaced column, black on white, dashed rules, uppercase labels, plain amounts ("495.00") with "PHP" only on the total. The page, the PDF and the email print the same rows:
- **Receipt number:** `HX-<branch code>-<number>`, counting up per branch (branch codes in `src/config/site.ts`: `TIP`, `BGC`, `TLK`).
- **Header:** title **SALES RECEIPT**, shop name **HERMES EXPRESS** and the logo in black; the **address of the branch the order was placed at** (BGC orders show the BGC address, Tipas orders the Tipas address, from `src/config/site.ts`); phone **Tel. 0939 008 2560** (`siteConfig.contacts.phone`); **VAT REG TIN** (stored in `src/config/site.ts`; a made-up demo number, `301-707-321-000`, chosen at random at the owner's request).
- **Order details:** Receipt No. (e.g. `HX-BGC-000123`), Order Code, Date/Time (`10/30/2026 09:15 AM`, Manila), Service (`PICKUP (ASAP)` or `DELIVERY (SCHEDULED …)`).
- **Items:** QTY, DESCRIPTION (upper case) and AMOUNT; under each, the unit price and, for custom drinks, the choices (e.g. "@200.00 16oz / Iced / Oat milk / Vanilla").
- **Totals:** SUBTOTAL, LESS: DISCOUNT (with the promo code), DELIVERY FEE (or FREE), **TOTAL AMOUNT DUE PHP …**.
- **VAT breakdown:** VATable Sales, VAT-Exempt Sales (0.00), Zero-Rated Sales (0.00) and VAT Amount (12%), all included in the total (VAT = total × 12/112). Everything on the menu is VATable; the zero lines are printed because PH receipts list them.
- **Payment and buyer:** `PAYMENT: GCASH (DEMO)  PAID` (or `TO BE PAID ON DELIVERY`), then SOLD TO name, phone, email, and the delivery address if any.
- **Footer:** "Thank you for ordering with Hermes Express", the tagline, and **"DEMO RECEIPT. NOT AN OFFICIAL RECEIPT."**

Where it lives:
- A **"Receipts"** link in the desktop header and the account menu. Phones keep the five bottom tabs (§4) and reach Receipts from the Profile page (owner decision). `/receipts` lists past receipts; `/receipts/[id]` shows one. Also linked from the order page.
- **Download PDF** button, built on the server with `@react-pdf/renderer` (`GET /api/receipts/[id]/pdf`). The PDF is an 80 mm receipt roll in the built-in Courier font.
- **Email:** checkout has a required "Email for your receipt" field, filled in with the account email and editable. The receipt (with the PDF attached) is sent there via Resend when the order is placed. If Resend is not configured, the order still succeeds and the email is skipped.
- **Email receipt** button (owner decision, alongside the automatic email): on `/receipts/[id]`, the order's customer can send the receipt again. It shows and only ever uses the checkout email, and sends at most once per order per minute. Staff viewing the receipt do not see it.

### Order statuses
`Received → Brewing → Ready for pickup | Out for delivery → Completed` (and `Cancelled`)

### Tracking (`/orders/[id]`)
- Animated progress: the Hermes mascot moves along the steps, the cup fills as it brews, and wings flap on "Out for delivery".
- Updates by polling every 10 seconds (no websockets; this keeps it serverless-friendly on Vercel).
- A "ding" plays on status change if sound is on.
- Receipt shown on screen, and emailed when the order is placed (see Receipts below).
- After `Completed`: rate each drink 1–5 stars with an optional comment.

---

## 8. Accounts, rewards, staff

### Roles
| Role | Can do |
|---|---|
| `customer` | Order, track, favorites, history, rewards, rate, profile |
| `barista` | Assigned to one branch. See that branch's live queue, update status, toggle sold-out |
| `admin` | Everything: all orders, menu & ingredient prices, promos, sold-out, sales dashboard, view/edit customer profiles, adjust points, manage staff roles |

Role checks run **on the server**: `src/proxy.ts` (Next.js 16's name for middleware) redirects signed-out visitors with a quick cookie check, and every page, server action and route handler checks the session and role with `requireUser()` / `requireRole()` (see [ADR 0002](decisions/0002-auth.md)).

Staff accounts are created by the seed script: one admin, and one barista per branch (`barista.<branch-slug>@hermes-express.test`), each with their **own** password from a separate environment variable (no shared passwords).

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
| `cart` | userId (PK), items (jsonb: choices and quantities, never prices), updatedAt (added in Stage 5, see ADR 0003) |
| `order` | id, code (e.g. `HX-7K2P`), userId, branchId, fulfillment (`pickup`/`delivery`), status, scheduledFor?, contactName, phone, receiptEmail, address?, notes, subtotal, discount, deliveryFee, pointsRedeemed, total, promoCodeId?, paymentMethod (`gcash_demo`/`card_demo`/`cod`), paymentStatus (`demo_paid`/`unpaid` for cash), clientRequestId (unique: one order per checkout), createdAt, updatedAt |
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

CI has no database yet, so E2E tests that need one (such as sign up → log out → log in) **skip themselves** when `DATABASE_URL` is missing. **TODO before Stage 5:** create a dedicated Neon `ci` branch, add `DATABASE_URL` and `BETTER_AUTH_SECRET` as GitHub repository secrets, and run migrations in CI before E2E (steps in `docs/SETUP.md`).

### CD (Vercel)
- Every PR gets a **preview deployment** (staging) with its own **Neon preview branch** database.
- Merging to `main` deploys to **production** automatically.
- DB migrations run in the build step: `vercel.json` sets the build command to `npm run db:migrate && npm run build`, so each deployment migrates its own database first. Migrations must be **additive** (no destructive changes without a migration plan).
- The seed script runs **only from a developer's machine** (`npm run db:seed`), never on Vercel, so seed passwords stay out of Vercel.
- Rollback: use "Promote previous deployment" in Vercel.

### Testing
- **Coverage gate:** 90% lines on `src/lib/**` and `src/server/**` (business logic); 70% overall.
- Must-test logic: pricing, promo validation, points earn/redeem, status transitions, badge unlocking, delivery fee, schedule slots, role checks.
- Component tests: builder steps, cart, checkout form validation.
- E2E: sign up → build drink → checkout → track; barista updates status; admin edits a price.

### Security basics
- Secrets only in `.env.local` / Vercel env vars. `.env*` is git-ignored except `.env.example`.
- Passwords hashed by Better Auth. Rate limiting on sign-up and login: 5 attempts per minute per email (stops password guessing) and 30 per minute per IP (loose, because Philippine mobile networks share one IP across many phones). Stored in Postgres so it holds across serverless instances.
- Secret values (passwords, `BETTER_AUTH_SECRET`) are never written into docs, commits, logs or chat; docs name the variable and where to get the value instead.
- Zod validation on every input; server-side price recomputation.
- No real payment data is ever collected.

### Environment variables
| Name | Purpose | Where it is set |
|---|---|---|
| `DATABASE_URL` | Neon connection | Auto-added by the Vercel + Neon integration; `.env.local` locally |
| `BETTER_AUTH_SECRET` | Session signing secret | `.env.local`; Vercel **Production + Preview** (a different value from local) |
| `BETTER_AUTH_URL` | App base URL | `.env.local` (`http://localhost:3000`); Vercel **Production only** (`https://hermes-express.vercel.app`). Previews leave it unset and use `VERCEL_URL`. |
| `RESEND_API_KEY` | Optional; emails are skipped if missing | Stage 5 (receipts) |
| `EMAIL_FROM` | Sender address | Stage 5 (receipts) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First admin account | `.env.local` only |
| `SEED_BARISTA_TIPAS_PASSWORD` | Tipas barista password (min. 8 characters) | `.env.local` only |
| `SEED_BARISTA_BGC_PASSWORD` | BGC barista password (min. 8 characters) | `.env.local` only |
| `SEED_BARISTA_LAKESHORE_PASSWORD` | Taguig Lakeshore barista password (min. 8 characters) | `.env.local` only |

The seed stops with a clear error if any seed variable is missing or a password is shorter than 8 characters.

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
| 5 | `stage-5-checkout` | Cart, checkout, demo payment, order creation; receipts (tab, PDF download, email) in a follow-up PR | P0 |
| 6 | `stage-6-tracking` | Tracker, barista queue, status updates, sold-out | P0 |
| 7 | `stage-7-admin` | Admin menu/ingredients/prices, orders, customers | P0/P2 |
| 8 | `stage-8-rewards` | Favorites, history, points, promos, ratings, badges, scheduling, other emails, sounds, surprise me | P1 |
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

### Decisions made by the owner (Stage 2)
| Topic | Decision |
|---|---|
| E2E without a database | The database E2E test skips itself in CI when `DATABASE_URL` is missing. A Neon `ci` branch + GitHub secret must be set up before Stage 5. |
| Migrations on Vercel | `vercel.json` build command: `npm run db:migrate && npm run build`. |
| Barista passwords | No shared password. Each branch barista has their own variable (`SEED_BARISTA_TIPAS_PASSWORD`, `SEED_BARISTA_BGC_PASSWORD`, `SEED_BARISTA_LAKESHORE_PASSWORD`), min. 8 characters; the seed fails clearly otherwise. |
| Secrets | All secrets and seed values live in `.env.local`. Vercel gets only `BETTER_AUTH_SECRET` (Production + Preview) and `BETTER_AUTH_URL` (Production only). Secret values are never printed in chat or docs. |

### Decisions made by the owner (Stage 3)
| Topic | Decision |
|---|---|
| Customized signature price | Menu price plus the price difference of the changes. An unchanged signature always costs its menu price (Olympus Latte ₱175 and Ambrosia Matcha ₱195 stay ₱5 below the sum of their parts). |
| Espresso shots | New additive column `ingredient.included_shots` (1 for espresso-based bases, empty for others) and an ingredient of kind `shot` priced ₱40, so the admin can edit it. Cold Brew cannot be served hot. |
| Menu data on Vercel | `npm run db:seed:catalog` (no secrets) runs in the Vercel build after migrations. It only inserts missing rows, so admin edits are never overwritten. |
| Demo states | Ube Cheese Pandesal is seasonal (Oct 1 – Dec 31, 2026). Cinnamon Roll is sold out at BGC only. Both can be changed later. |
| Pastries vs snacks | Snacks: Chocolate Chip Cookie, Ham & Cheese Croissant Sandwich, Chicken Pesto Panini. Everything else in §6 is a pastry. |
| `OLYMPUS20` window | Nov 1 – Dec 31, 2026 (Manila time). |
| More drinks | Seven more signatures: three frappes, two cold brews and two hot brews (§6), each priced at exactly the sum of its parts. `/menu` groups drinks into Hot, Iced and Frappes. |
| Menu photos | Real, free-licence photos from Wikimedia Commons, one per product, checked by eye to match the item. No photos showing other brands' logos. Credits on `/credits`. The seed fills a photo only where a product has none. |
| Branch picker | Switching branches is instant: the page carries every branch's sold-out list, and the browser saves the choice in the `hx_menu_branch` cookie (not HTTP-only; it holds only a branch name). |
| Receipts | Built in Stage 5 with checkout (moved from Stage 8): own tab, PDF download, emailed to an address entered at checkout. Shows branch address, phone, TIN and a VAT line (§7). |

### Decisions made by the owner (Stage 4)
| Topic | Decision |
|---|---|
| Builder link | `/build?from=<slug>` opens a signature drink in the builder. The older `?drink=<slug>` still works. Menu and landing links use `?from=`. |
| Builder E2E in CI | The build-a-drink E2E test needs the seeded catalog, so it skips without `DATABASE_URL` (like the menu tests) until the Neon `ci` branch exists. A no-database test still checks `/build` renders. |
| Reset | Reset returns to where the drink started: the signature recipe when opened from one, otherwise an empty cup. Reset can be undone. |
| Syrups and toppings | No limit (was max 3 syrups and 5 toppings): customers add as many as they like, each once. The server keeps a hidden safety cap of 30 per list to reject junk requests. |

### Decisions made by the owner (Stage 8)
| Topic | Decision |
|---|---|
| Cash at Pickup | Added at the owner's request: pickup orders can pay cash at the counter. Saved as `cash_pickup` and `unpaid`. This replaces the Stage 5 rule that pickup offers only demo payments. |
| Admin promos | `/admin/promos` is built in Stage 8: create, edit, switch on or off. No deleting, renaming or editing the used count. |
| Promo uses | A use is counted with the order and returned if the order is cancelled. A cancelled order does not use up a first-order code. |

### Decisions approved by the owner (Stage 7)
| Topic | Decision |
|---|---|
| Summary cards | Today is the Manila day. Cancelled orders are excluded; Cash on Delivery orders count as sales. |
| Sold-out in admin | Reuses `setSoldOut`, which already allows admins at any branch. |
| Products | Slug and type are fixed once created. Products are hidden, never deleted. Signature drinks must have a valid recipe. Seasonal items need both dates, whole Manila days; turning seasonal off clears them. No photo upload yet. |
| Ingredients | Edit only, no creating. `12oz`, `hot` and milk `none` can't be switched off (the builder relies on them), nor can the last active size, temperature, base or milk. |
| Roles | Admins can't change their own role, so the last admin can't lock everyone out. A barista must have a branch; other roles have none. |
| Points | An adjustment needs a whole non-zero number and a reason, and can't take a balance below zero. No schema change in this stage: the ledger hook is a no-op, so adjustments before Stage 8 leave no history. |
| Staff phone | An admin may leave a phone empty, because staff accounts may not have one. |

### Decisions approved by the owner (Stage 6)
| Topic | Decision |
|---|---|
| Cancel button | The queue offers "Cancel order" with a confirm step, separate from the one-tap button, until the drink is ready. |
| Admin on `/barista` | Admins have no branch, so they switch with `?branch=<slug>`. `/admin/orders` stays in Stage 7. |
| Toast | Hand-built, with no new dependency. |
| Ding | The sound hook is called on status changes and new orders; audio files arrive in Stage 8. |
| Queue contents | Active orders only. Completed and Cancelled leave the board. |
| Ratings | Rating after `Completed` stays in Stage 8. |
| Receipt on the order page | Shown in a section that is open by default, below the items. |

### Decisions made by the owner (Stage 5)
| Topic | Decision |
|---|---|
| Receipts | Built in a follow-up PR straight after the checkout PR, to keep each PR reviewable. Checkout already asks for the receipt email and stores it on the order (`receipt_email`). |
| Receipt numbers | Real per-branch counters (`HX-BGC-000123`) through an additive migration: `branch.receipt_seq` and `order.receipt_number`. Orders placed before it were numbered per branch, oldest first. |
| Receipt dependencies | `@react-pdf/renderer` (server-side PDF) and `resend` (receipt email) approved. |
| Receipt style | Formal, like a printed PH sales receipt (chosen from three mock-ups: PH sales receipt, business invoice, wording only). TIN and the VAT lines stay. |
| Receipts on phones | No sixth bottom tab: phones keep Home · Menu · Build · Cart · Profile, and Receipts sits in the account menu and on Profile. Desktop has a Receipts header link. |
| Saved cart | New `cart` table (one row per user, choices only, never prices). A guest's `localStorage` cart is merged into it on login; logout forgets it on the device (ADR 0003). |
| Cash on Delivery | Offered for delivery only; pickup offers GCash (Demo) and Card (Demo). Cash orders are saved as `unpaid`, demo payments as `demo_paid`. |
| Scheduling | Slots every 15 minutes from opening time to 15 minutes before closing, today and the next 2 days, at least 20 minutes from now. ASAP only while the branch is open and not in its last 15 minutes. Manila time. |
| Delivery area | Taguig City only, checked with a barangay list (`src/config/delivery-areas.ts`): the 28 original barangays, with Fort Bonifacio shown as "Fort Bonifacio (BGC)", plus the 10 EMBO barangays. |
| CI database | Still to do by the owner: a Neon `ci` branch and the `DATABASE_URL` / `BETTER_AUTH_SECRET` repository secrets. Until then the database E2E tests, including checkout, skip in CI and run locally. |
| Cup fill | A finished drink fills the cup to the brim; foams finish at the brim and whipped cream sits on the rim. |
