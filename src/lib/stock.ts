/**
 * The barista's stock list for one branch: what can be switched off, and why a
 * signature drink is unavailable when its own switch is on.
 */
import {
  recipeSlugs,
  type CatalogSnapshot,
  type IngredientKind,
} from "./catalog";

/** Sizes, temperatures and the shot price are options, not stock. */
export const STOCK_INGREDIENT_KINDS = [
  "base",
  "milk",
  "syrup",
  "topping",
] as const satisfies readonly IngredientKind[];

export type StockItem = {
  id: string;
  name: string;
  isSoldOut: boolean;
  /** Sold-out ingredients that stop this drink being ordered. */
  blockedBy: string[];
};

export type StockList = {
  products: StockItem[];
  ingredients: {
    kind: (typeof STOCK_INGREDIENT_KINDS)[number];
    items: StockItem[];
  }[];
};

export function buildStockList(
  snapshot: CatalogSnapshot,
  branchSlug: string,
): StockList {
  const flags = snapshot.soldOut.filter((f) => f.branchSlug === branchSlug);
  const soldOutIngredientIds = new Set(flags.map((f) => f.ingredientId));
  const soldOutProductIds = new Set(flags.map((f) => f.productId));
  const soldOutIngredients = new Map(
    snapshot.ingredients
      .filter((i) => soldOutIngredientIds.has(i.id))
      .map((i) => [i.slug, i.name]),
  );

  return {
    products: snapshot.products
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isSoldOut: soldOutProductIds.has(p.id),
        blockedBy: p.recipe
          ? recipeSlugs(p.recipe).flatMap((slug) => {
              const name = soldOutIngredients.get(slug);
              return name ? [name] : [];
            })
          : [],
      })),
    ingredients: STOCK_INGREDIENT_KINDS.map((kind) => ({
      kind,
      items: snapshot.ingredients
        .filter((i) => i.kind === kind && i.isActive)
        .map((i) => ({
          id: i.id,
          name: i.name,
          isSoldOut: soldOutIngredientIds.has(i.id),
          blockedBy: [],
        })),
    })),
  };
}
