/**
 * Catalog vocabulary shared by the database schema, the seed, pricing and the
 * menu. Pure types and functions only.
 */

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
