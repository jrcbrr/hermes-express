# ADR 0003: Cart storage and placing orders

- **Status:** Accepted
- **Date:** 2026-10-29
- **Stage:** 5 (checkout)

## Context

Customers browse and build drinks without an account, but must log in to check out (docs/PLAN.md §7). A guest's cart must survive a page reload and come along when they log in, and a signed-in customer should find the same cart on another device. The app runs on serverless functions, the menu can change (prices, sold-out flags, seasonal items) while something sits in a cart, and the browser must never decide what an order costs.

## Decision

1. **The cart holds choices, never prices.** An item is a product slug or a `DrinkConfig`, plus a quantity. Prices are worked out from the current catalog each time the cart is shown (`priceCartItems()`), and again by the server when the order is placed. A changed price or a sold-out item shows up in the cart straight away instead of at payment.
2. **Guests keep the cart in `localStorage`** (`hx_cart`), read with `useSyncExternalStore`, so it survives reloads and stays in step across tabs without a server.
3. **Signed-in customers also have a saved cart** in a new `cart` table (one row per user, items as JSON). This table is an addition to the PLAN §9 data model. On login the guest cart is merged into it once (`mergeCarts()`: same item → quantities added, capped at 20). After that, each change is saved shortly after it happens. The browser copy remembers which account it belongs to, so after logout it is forgotten, and another account's cart is never merged into yours.
4. **`placeOrder` trusts nothing from the browser.** It re-validates with Zod (unknown fields such as a price are dropped), recomputes every line with `calculateDrinkPrice()` and the product price, re-checks the time slot with the server's clock, and refuses the whole order if any item is sold out at the branch.
5. **One batch, one transaction.** The Neon HTTP driver has no interactive transactions, so the order, its items and the first status event are sent as one `db.batch()`, which Neon runs as a single transaction. Ids are made on the server (`randomUUID()`) so the three inserts don't need each other's results.
6. **One order per checkout.** The browser makes a `clientRequestId` (a UUID) once per checkout. It is unique in the `order` table, so a double tap or a retry after a dropped connection returns the existing order instead of creating a second one.
7. **Short codes with retry.** Codes are `HX-` plus 4 characters from an alphabet without look-alikes (no 0/O, 1/I/L, U/V): about 700,000 codes. A unique index catches the rare duplicate, and the server retries with a new code (up to 5 times).

## Consequences

- Prices in an open cart can change before checkout; the cart and checkout always show the current price, and the order keeps the price paid (snapshots in `order_item`).
- The saved cart is a small extra table and two background server actions. If they fail (offline), the browser copy keeps working.
- The order code is short enough to say at the counter. If volume ever grows, `ORDER_CODE_LENGTH` can be raised without a migration.
- Receipts (PLAN §7) build on these tables in a follow-up PR; `receipt_email` is already stored on each order.

## Alternatives considered

- **Cart only in the database:** guests would need a cookie-identified cart row, plus clean-up of abandoned carts. More moving parts for little gain.
- **Cart only in `localStorage`:** simplest, but it would not follow a customer to another device, which the brief asks for ("merged into the account on login").
- **Prices stored in the cart:** faster to display, but they go stale and invite tampering. Recomputing is cheap (about 70 catalog rows, cached).
