/**
 * Loyalty points (docs/PLAN.md §8). Pure functions: earn 1 point per ₱10 spent
 * after discounts, excluding delivery; redeem points for one free drink.
 */
import type { CartItem } from "./cart";
import { toPricingCatalog, type CatalogSnapshot } from "./catalog";
import { calculateDrinkPrice, PricingError } from "./pricing";
import type { DrinkSize } from "./validation/drink";

export const POINTS_REASONS = ["earn", "redeem", "admin_adjust"] as const;
export type PointsReason = (typeof POINTS_REASONS)[number];

/** ₱10 in centavos. */
export const CENTAVOS_PER_POINT = 1000;

export const REWARD_TIERS: readonly { size: DrinkSize; points: number }[] = [
  { size: "12oz", points: 150 },
  { size: "16oz", points: 250 },
  { size: "22oz", points: 350 },
];

/** Points an order earns once Completed. */
export function pointsEarned(
  subtotalCentavos: number,
  discountCentavos: number,
): number {
  return Math.floor(
    Math.max(0, subtotalCentavos - discountCentavos) / CENTAVOS_PER_POINT,
  );
}

/** What one free drink costs in points and takes off the order. */
export type DrinkReward = { points: number; valueCentavos: number };

function pointsFor(size: DrinkSize): number {
  return REWARD_TIERS.find((tier) => tier.size === size)!.points;
}

/**
 * The reward for one unit of a cart item, or null when it isn't a drink that
 * qualifies. The drink is free and add-ons are still charged: a built drink's
 * base and size, or a signature's menu price at the chosen size.
 */
export function rewardForItem(
  item: CartItem,
  snapshot: CatalogSnapshot,
): DrinkReward | null {
  if (item.kind === "product") {
    const product = snapshot.products.find((p) => p.slug === item.productSlug);
    if (product?.type !== "signature" || product.recipe === null) return null;
    return {
      points: pointsFor(product.recipe.size),
      valueCentavos: product.priceCentavos,
    };
  }

  const pricing = toPricingCatalog(snapshot);
  let unit: number;
  let lines: ReturnType<typeof calculateDrinkPrice>["lines"];
  try {
    const price = calculateDrinkPrice(item.config, pricing);
    unit = price.unitPriceCentavos;
    lines = price.lines;
  } catch (error) {
    if (error instanceof PricingError) return null;
    throw error;
  }

  const sizePrice = (slug: string) =>
    pricing.ingredients.find((i) => i.slug === slug)?.priceCentavos ?? 0;
  const signature = pricing.signatures.find(
    (s) => s.slug === item.config.signature,
  );
  const value = signature
    ? signature.priceCentavos +
      sizePrice(item.config.size) -
      sizePrice(signature.recipe.size)
    : lines
        .filter((line) => line.kind === "base" || line.kind === "size")
        .reduce((total, line) => total + line.centavos, 0);
  return {
    points: pointsFor(item.config.size),
    valueCentavos: Math.min(value, unit),
  };
}
