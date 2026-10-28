/**
 * Catalog vocabulary shared by the database schema, the seed, pricing and the
 * menu. Pure types and functions only.
 */
import { siteConfig } from "@/config/site";
import type { PricingCatalog } from "./pricing";
import type { DrinkConfig } from "./validation/drink";

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

/** Cookie holding the slug of the branch the customer is browsing. */
export const BRANCH_COOKIE = "hx_branch";

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
        isSeasonal: p.isSeasonal,
        isSoldOut: isSoldOut(p),
      })),
  }));
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
