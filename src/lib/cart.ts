/**
 * The cart (docs/PLAN.md §7). Pure functions only, shared by the browser
 * (localStorage cart, cart page, checkout) and the server (saved account
 * cart, placeOrder).
 *
 * A cart item says *what* the customer wants, never what it costs: prices
 * are always worked out from the current catalog by priceCartItems().
 */
import { siteConfig } from "@/config/site";
import {
  isAvailableNow,
  soldOutCheck,
  soldOutIngredientsByBranch,
  toPricingCatalog,
  type CatalogSnapshot,
} from "./catalog";
import { multiplyCentavos } from "./money";
import {
  calculateDrinkPrice,
  MAX_LINE_QUANTITY,
  PricingError,
} from "./pricing";
// Type-only: the header's cart badge loads this file on every page, and the
// drink schema would pull Zod into every page. Full checks live in
// ./validation/cart.ts.
import type { DrinkConfig } from "./validation/drink";

/** Different items a cart can hold (each may have a quantity up to 20). */
export const MAX_CART_LINES = 30;

export type ProductCartItem = {
  id: string;
  kind: "product";
  productSlug: string;
  quantity: number;
};

export type CustomCartItem = {
  id: string;
  kind: "custom";
  config: DrinkConfig;
  quantity: number;
};

export type CartItem = ProductCartItem | CustomCartItem;

/** A cart item before it has an id. */
export type NewCartItem =
  Omit<ProductCartItem, "id"> | Omit<CustomCartItem, "id">;

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.round(quantity)));
}

function sorted(list: readonly string[]): string[] {
  return [...list].sort();
}

/** A stable text form of a drink, so two identical drinks compare equal. */
function drinkKey(config: DrinkConfig): string {
  return JSON.stringify([
    config.size,
    config.temperature,
    config.iceLevel ?? null,
    config.base,
    config.shots ?? null,
    config.milk,
    config.milkAmount,
    config.sweetness,
    sorted(config.syrups),
    sorted(config.toppings),
    config.name ?? null,
    config.signature ?? null,
  ]);
}

/** True when two items are the same thing (quantity and id aside). */
export function sameCartContent(a: NewCartItem, b: NewCartItem): boolean {
  if (a.kind === "product" && b.kind === "product") {
    return a.productSlug === b.productSlug;
  }
  if (a.kind === "custom" && b.kind === "custom") {
    return drinkKey(a.config) === drinkKey(b.config);
  }
  return false;
}

/**
 * Adds an item. The same item already in the cart gets its quantity raised
 * instead (up to 20). `ok` is false when the cart is full.
 */
export function addToCart(
  items: readonly CartItem[],
  entry: NewCartItem,
  id: string,
): { items: CartItem[]; ok: boolean } {
  const quantity = clampQuantity(entry.quantity);
  const existing = items.find((item) => sameCartContent(item, entry));
  if (existing) {
    return {
      items: items.map((item) =>
        item === existing
          ? { ...item, quantity: clampQuantity(item.quantity + quantity) }
          : item,
      ),
      ok: true,
    };
  }
  if (items.length >= MAX_CART_LINES) return { items: [...items], ok: false };
  return {
    items: [...items, { ...entry, id, quantity } as CartItem],
    ok: true,
  };
}

export function setCartQuantity(
  items: readonly CartItem[],
  id: string,
  quantity: number,
): CartItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item,
  );
}

export function removeFromCart(
  items: readonly CartItem[],
  id: string,
): CartItem[] {
  return items.filter((item) => item.id !== id);
}

/** Replaces an item (an edited drink), keeping its id and place in the cart. */
export function replaceCartItem(
  items: readonly CartItem[],
  id: string,
  entry: NewCartItem,
): CartItem[] {
  return items.map((item) =>
    item.id === id
      ? ({ ...entry, id, quantity: clampQuantity(entry.quantity) } as CartItem)
      : item,
  );
}

export function findCartItem(
  items: readonly CartItem[],
  id: string,
): CartItem | undefined {
  return items.find((item) => item.id === id);
}

/** Number of cups and pastries in the cart. */
export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

/**
 * Merges a guest's cart into their account's saved cart when they log in.
 * Items already in the account (same id or same content) are combined, so
 * merging twice never doubles anything with the same id.
 */
export function mergeCarts(
  account: readonly CartItem[],
  guest: readonly CartItem[],
): CartItem[] {
  let merged = [...account];
  for (const item of guest) {
    if (merged.some((m) => m.id === item.id)) continue;
    const same = merged.find((m) => sameCartContent(m, item));
    if (same) {
      merged = setCartQuantity(merged, same.id, same.quantity + item.quantity);
    } else if (merged.length < MAX_CART_LINES) {
      merged.push(item);
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Stored cart (localStorage)
// ---------------------------------------------------------------------------

/** The cart as kept in the browser. */
export type StoredCart = {
  /** The account it was saved to, or null for a guest's cart. */
  owner: string | null;
  items: CartItem[];
};

export const EMPTY_CART: StoredCart = { owner: null, items: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A quick shape check; the full check is cartItemSchema on the server. */
function looksLikeCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id === "") return false;
  if (typeof value.quantity !== "number") return false;
  if (value.kind === "product") return typeof value.productSlug === "string";
  if (value.kind === "custom") return isRecord(value.config);
  return false;
}

/**
 * Reads a cart saved in the browser. Anything that doesn't look like a cart
 * (an old format, or edited by hand) is dropped instead of breaking the page.
 */
export function readStoredCart(value: unknown): StoredCart {
  if (!isRecord(value) || !Array.isArray(value.items)) return EMPTY_CART;
  return {
    owner: typeof value.owner === "string" ? value.owner : null,
    items: value.items
      .filter(looksLikeCartItem)
      .slice(0, MAX_CART_LINES)
      .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) })),
  };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export type PricedCartItem = {
  item: CartItem;
  name: string;
  /** Custom drinks: the choices, e.g. ["16oz", "Iced", "Oat Milk", "Vanilla"]. */
  details: string[];
  /** Null when the item can't be ordered (see `problem`). */
  unitPriceCentavos: number | null;
  lineTotalCentavos: number | null;
  /** Why the item can't be ordered right now, for the customer. */
  problem: string | null;
};

const AMOUNT_WORDS = { light: "Light", regular: "Regular", extra: "Extra" };

/** The customer-facing name of a custom drink. */
function customDrinkName(
  config: DrinkConfig,
  names: ReadonlyMap<string, string>,
  signatureName: string | undefined,
): string {
  if (config.name !== undefined) return config.name;
  if (signatureName !== undefined) return `${signatureName} (customized)`;
  return `Custom ${names.get(config.base) ?? config.base}`;
}

/**
 * A custom drink's choices, in builder order, for the cart and the order
 * snapshot: "16oz · Iced · Latte · Oat Milk · 50% sweet · Vanilla".
 */
export function drinkDetails(
  config: DrinkConfig,
  names: ReadonlyMap<string, string>,
): string[] {
  const name = (slug: string) => names.get(slug) ?? slug;
  const details = [config.size, name(config.temperature)];
  if (config.iceLevel !== undefined && config.iceLevel !== "regular") {
    details.push(`${AMOUNT_WORDS[config.iceLevel]} ice`);
  }
  details.push(name(config.base));
  if (config.shots !== undefined) {
    details.push(`${config.shots} ${config.shots === 1 ? "shot" : "shots"}`);
  }
  if (config.milk === "none") {
    details.push("No milk");
  } else {
    details.push(
      config.milkAmount === "regular"
        ? name(config.milk)
        : `${name(config.milk)} (${AMOUNT_WORDS[config.milkAmount].toLowerCase()})`,
    );
  }
  details.push(`${config.sweetness}% sweet`);
  for (const slug of [...config.syrups, ...config.toppings]) {
    details.push(name(slug));
  }
  return details;
}

function branchName(branchSlug: string): string {
  return (
    siteConfig.branches.find((b) => b.slug === branchSlug)?.name ?? branchSlug
  );
}

/**
 * Prices every cart item at a branch from the catalog, and says which items
 * can't be ordered there right now (sold out, off the menu, or no longer
 * valid). The cart page, checkout and placeOrder all use this.
 */
export function priceCartItems(
  items: readonly CartItem[],
  snapshot: CatalogSnapshot,
  branchSlug: string,
  now: Date,
): PricedCartItem[] {
  const pricing = toPricingCatalog(snapshot);
  const names = new Map(snapshot.ingredients.map((i) => [i.slug, i.name]));
  const isProductSoldOut = soldOutCheck(snapshot, branchSlug);
  const soldOutIngredients = new Set(
    soldOutIngredientsByBranch(snapshot)[branchSlug] ?? [],
  );
  // A customized signature is only sold out when the drink itself is flagged:
  // the customer may have swapped out the recipe's sold-out ingredients.
  const flaggedProducts = new Set(
    snapshot.soldOut
      .filter((f) => f.branchSlug === branchSlug && f.productId !== null)
      .map((f) => f.productId),
  );
  const at = branchName(branchSlug);

  return items.map((item): PricedCartItem => {
    const priced = (unit: number) => ({
      unitPriceCentavos: unit,
      lineTotalCentavos: multiplyCentavos(unit, item.quantity),
    });
    const unpriced = { unitPriceCentavos: null, lineTotalCentavos: null };

    if (item.kind === "product") {
      const product = snapshot.products.find(
        (p) => p.slug === item.productSlug,
      );
      if (!product || !isAvailableNow(product, now)) {
        return {
          item,
          name: product?.name ?? "Item no longer on the menu",
          details: [],
          ...unpriced,
          problem: "This item is no longer on the menu. Please remove it.",
        };
      }
      return {
        item,
        name: product.name,
        details: [],
        ...priced(product.priceCentavos),
        problem: isProductSoldOut(product) ? `Sold out at ${at}.` : null,
      };
    }

    const signature =
      item.config.signature === undefined
        ? undefined
        : snapshot.products.find((p) => p.slug === item.config.signature);
    const name = customDrinkName(item.config, names, signature?.name);
    let details: string[];
    let unit: number;
    try {
      // Checks the drink's shape first, so the details below are safe to build.
      unit = calculateDrinkPrice(item.config, pricing).unitPriceCentavos;
      details = drinkDetails(item.config, names);
    } catch (error) {
      if (!(error instanceof PricingError)) throw error;
      return {
        item,
        name,
        details: [],
        ...unpriced,
        problem:
          "This drink can no longer be made as chosen. Please edit or remove it.",
      };
    }

    if (signature && !isAvailableNow(signature, now)) {
      return {
        item,
        name,
        details,
        ...unpriced,
        problem: "This drink is no longer on the menu. Please remove it.",
      };
    }
    const missing = [
      item.config.base,
      item.config.milk,
      ...item.config.syrups,
      ...item.config.toppings,
    ].filter((slug) => soldOutIngredients.has(slug));
    const problem =
      missing.length > 0
        ? `${missing.map((slug) => names.get(slug) ?? slug).join(", ")} ${
            missing.length === 1 ? "is" : "are"
          } sold out at ${at}.`
        : signature && flaggedProducts.has(signature.id)
          ? `Sold out at ${at}.`
          : null;
    return { item, name, details, ...priced(unit), problem };
  });
}
