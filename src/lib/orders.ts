/**
 * Turning a checked cart into an order (docs/PLAN.md §7, §9). Pure functions:
 * placeOrder (src/server/orders/actions.ts) loads the data, calls these, and
 * saves the result.
 */
import type { BranchService } from "@/config/site";
import type { NewCartItem, PricedCartItem } from "./cart";
import { multiplyCentavos } from "./money";
import { calculateCartTotals, type CartTotals } from "./pricing";
import type { DrinkConfig } from "./validation/drink";

export type OrderItemKind = "custom" | "product";

/** What `order_item.config` keeps, so an old order reads the same forever. */
export type OrderItemConfig = {
  /** Custom drinks only: the drink exactly as ordered. */
  drink?: DrinkConfig;
  /** Products: the menu slug at order time. */
  productSlug?: string;
  /** The choices as the customer saw them, e.g. ["16oz", "Iced", "Oat milk"]. */
  details: string[];
};

export type OrderLine = {
  kind: OrderItemKind;
  /** Signature or pastry slug, looked up to an id by the server. */
  productSlug: string | null;
  name: string;
  config: OrderItemConfig;
  unitPriceCentavos: number;
  quantity: number;
  lineTotalCentavos: number;
};

/** An item that can't be ordered, with the reason for the customer. */
export type OrderProblem = { itemId: string; name: string; problem: string };

export type OrderDraft =
  | { ok: true; lines: OrderLine[]; totals: CartTotals }
  | { ok: false; problems: OrderProblem[] };

/**
 * Builds the order lines and totals from priced cart items. Any item with a
 * problem (sold out, off the menu) stops the whole order, so the customer is
 * never charged for less than they chose.
 *
 * `discountCentavos` is the extension point for Stage 8 (promo codes and
 * points); it is 0 until then.
 */
export function draftOrder(
  priced: readonly PricedCartItem[],
  fulfillment: BranchService,
  discountCentavos = 0,
): OrderDraft {
  const problems: OrderProblem[] = [];
  const lines: OrderLine[] = [];
  for (const p of priced) {
    if (p.problem !== null || p.unitPriceCentavos === null) {
      problems.push({
        itemId: p.item.id,
        name: p.name,
        problem: p.problem ?? "This item cannot be ordered right now.",
      });
      continue;
    }
    lines.push({
      kind: p.item.kind,
      productSlug:
        p.item.kind === "product"
          ? p.item.productSlug
          : (p.item.config.signature ?? null),
      name: p.name,
      config:
        p.item.kind === "product"
          ? { productSlug: p.item.productSlug, details: p.details }
          : { drink: p.item.config, details: p.details },
      unitPriceCentavos: p.unitPriceCentavos,
      quantity: p.item.quantity,
      lineTotalCentavos: multiplyCentavos(p.unitPriceCentavos, p.item.quantity),
    });
  }
  if (problems.length > 0) return { ok: false, problems };
  if (lines.length === 0) {
    return {
      ok: false,
      problems: [{ itemId: "", name: "", problem: "Your cart is empty." }],
    };
  }
  const totals = calculateCartTotals({ lines, fulfillment, discountCentavos });
  return { ok: true, lines, totals };
}

/** What an old order line becomes in the cart: choices only, never prices. */
export function reorderEntry(line: {
  quantity: number;
  config: OrderItemConfig;
}): NewCartItem | null {
  if (line.config.drink) {
    return {
      kind: "custom",
      config: line.config.drink,
      quantity: line.quantity,
    };
  }
  return line.config.productSlug
    ? {
        kind: "product",
        productSlug: line.config.productSlug,
        quantity: line.quantity,
      }
    : null;
}

/** No 0/O, 1/I/L or U/V, so codes are easy to read aloud at the counter. */
export const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ";
export const ORDER_CODE_LENGTH = 4;

/**
 * A short order code like "HX-7K2P". `random` returns whole numbers in
 * [0, alphabet length); it is crypto-based in the app and fixed in tests.
 */
export function generateOrderCode(random: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_CODE_ALPHABET[random(ORDER_CODE_ALPHABET.length)];
  }
  return `HX-${code}`;
}
