/**
 * Catalog vocabulary shared by the database schema, the seed, pricing and the
 * menu. Pure types and functions only.
 */
import { siteConfig } from "@/config/site";
import type { PricingCatalog } from "./pricing";
// Type-only: this file also runs in the browser (menu), and the drink schema
// module would pull Zod into the page bundle.
import type { DrinkConfig, DrinkTemperature } from "./validation/drink";

export const INGREDIENT_KINDS = [
  "size",
  "temperature",
  "base",
  "milk",
  "syrup",
  "topping",
  /** One row: the price of each extra espresso shot. */
  "shot",
] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

export const PRODUCT_TYPES = ["signature", "pastry", "snack"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PROMO_TYPES = ["percent", "fixed"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

/**
 * Cookie holding the slug of the branch the customer is browsing. The browser
 * writes it directly (no trip to the server), so it is not HTTP-only; it holds
 * nothing private. Renamed from "hx_branch", an HTTP-only cookie the browser
 * could not overwrite.
 */
export const BRANCH_COOKIE = "hx_menu_branch";
export const BRANCH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The document.cookie string that remembers a branch for a year. */
export function branchCookieString(slug: string, secure: boolean): string {
  return [
    `${BRANCH_COOKIE}=${encodeURIComponent(slug)}`,
    "path=/",
    `max-age=${BRANCH_COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
    ...(secure ? ["secure"] : []),
  ].join("; ");
}

export type CatalogIngredient = {
  id: string;
  kind: IngredientKind;
  slug: string;
  name: string;
  priceCentavos: number;
  color: string | null;
  includedShots: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type CatalogProduct = {
  id: string;
  type: ProductType;
  slug: string;
  name: string;
  description: string;
  priceCentavos: number;
  imageUrl: string | null;
  recipe: DrinkConfig | null;
  isSeasonal: boolean;
  availableFrom: Date | null;
  availableTo: Date | null;
  sortOrder: number;
  isActive: boolean;
};

/** One "sold out at this branch" flag. Exactly one of the ids is set. */
export type SoldOutFlag = {
  branchSlug: string;
  ingredientId: string | null;
  productId: string | null;
};

/** Everything the menu and the pricing need, loaded in one go. */
export type CatalogSnapshot = {
  ingredients: CatalogIngredient[];
  products: CatalogProduct[];
  soldOut: SoldOutFlag[];
};

export type MenuItem = {
  type: ProductType;
  slug: string;
  name: string;
  description: string;
  priceCentavos: number;
  imageUrl: string | null;
  /** Hot, iced or blended, from the recipe. Null for pastries and snacks. */
  temperature: DrinkTemperature | null;
  isSeasonal: boolean;
  isSoldOut: boolean;
};

export type MenuSection = {
  type: ProductType;
  items: MenuItem[];
};

/** A known branch slug, or the first branch when the value is missing or unknown. */
export function resolveBranchSlug(value: string | undefined): string {
  const branches = siteConfig.branches;
  return (branches.find((b) => b.slug === value) ?? branches[0]).slug;
}

/** Active, and inside its available-from/to window when it has one. */
export function isAvailableNow(
  product: Pick<CatalogProduct, "isActive" | "availableFrom" | "availableTo">,
  now: Date,
): boolean {
  return (
    product.isActive &&
    (product.availableFrom === null || product.availableFrom <= now) &&
    (product.availableTo === null || product.availableTo >= now)
  );
}

/** Every ingredient slug a drink uses (size, temperature, base, milk, syrups, toppings). */
export function recipeSlugs(config: DrinkConfig): string[] {
  return [
    config.size,
    config.temperature,
    config.base,
    config.milk,
    ...config.syrups,
    ...config.toppings,
  ];
}

/**
 * Sold out at a branch: flagged directly, or (signature drinks) any
 * ingredient in its recipe is sold out or switched off there.
 */
function soldOutCheck(snapshot: CatalogSnapshot, branchSlug: string) {
  const flags = snapshot.soldOut.filter((f) => f.branchSlug === branchSlug);
  const productIds = new Set(flags.map((f) => f.productId));
  const ingredientIds = new Set(flags.map((f) => f.ingredientId));
  const unavailableSlugs = new Set(
    snapshot.ingredients
      .filter((i) => !i.isActive || ingredientIds.has(i.id))
      .map((i) => i.slug),
  );
  return (product: CatalogProduct) =>
    productIds.has(product.id) ||
    (product.recipe !== null &&
      recipeSlugs(product.recipe).some((slug) => unavailableSlugs.has(slug)));
}

/** The menu for one branch: available products grouped by type, in menu order. */
export function buildMenu(
  snapshot: CatalogSnapshot,
  branchSlug: string,
  now: Date,
): MenuSection[] {
  const isSoldOut = soldOutCheck(snapshot, branchSlug);
  const available = snapshot.products
    .filter((p) => isAvailableNow(p, now))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return PRODUCT_TYPES.map((type) => ({
    type,
    items: available
      .filter((p) => p.type === type)
      .map((p) => ({
        type: p.type,
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceCentavos: p.priceCentavos,
        imageUrl: p.imageUrl,
        temperature: p.recipe?.temperature ?? null,
        isSeasonal: p.isSeasonal,
        isSoldOut: isSoldOut(p),
      })),
  }));
}

/**
 * For every branch, the slugs of the products sold out there. Sent to the
 * menu page once, so switching branches needs no trip to the server.
 */
export function soldOutSlugsByBranch(
  snapshot: CatalogSnapshot,
  now: Date,
): Record<string, string[]> {
  return Object.fromEntries(
    siteConfig.branches.map((b) => [
      b.slug,
      buildMenu(snapshot, b.slug, now).flatMap((section) =>
        section.items.filter((i) => i.isSoldOut).map((i) => i.slug),
      ),
    ]),
  );
}

export type DrinkGroup = {
  /** Null holds drinks without a recipe (should not happen; never hidden). */
  temperature: DrinkTemperature | null;
  items: MenuItem[];
};

/** Signature drinks split into hot, iced and blended (frappes), skipping empty groups. */
export function groupDrinks(items: MenuItem[]): DrinkGroup[] {
  const order: (DrinkTemperature | null)[] = ["hot", "iced", "blended", null];
  const groups: DrinkGroup[] = order.map((temperature) => ({
    temperature,
    items: items.filter((i) => i.temperature === temperature),
  }));
  return groups.filter((g) => g.items.length > 0);
}

/** The catalog in the shape calculateDrinkPrice() expects. */
export function toPricingCatalog(snapshot: CatalogSnapshot): PricingCatalog {
  return {
    ingredients: snapshot.ingredients.map((i) => ({
      slug: i.slug,
      name: i.name,
      kind: i.kind,
      priceCentavos: i.priceCentavos,
      includedShots: i.includedShots,
      isActive: i.isActive,
    })),
    signatures: snapshot.products.flatMap((p) =>
      p.type === "signature" && p.recipe !== null
        ? [
            {
              slug: p.slug,
              name: p.name,
              priceCentavos: p.priceCentavos,
              recipe: p.recipe,
              isActive: p.isActive,
            },
          ]
        : [],
    ),
  };
}
