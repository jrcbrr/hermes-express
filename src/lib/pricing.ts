/**
 * The one place prices are calculated (docs/PLAN.md §9, "Key rules").
 *
 * Pure functions: the builder calls them for the live price, and the server
 * calls them again with catalog data from the database before saving an
 * order. Prices sent by the browser are never trusted.
 */
import type { BranchService } from "@/config/site";
import type { IngredientKind } from "./catalog";
import { multiplyCentavos, sumCentavos } from "./money";
import { drinkConfigSchema, type DrinkConfig } from "./validation/drink";

/** Slug of the `shot` ingredient that holds the extra-shot price. */
export const EXTRA_SHOT_SLUG = "extra-shot";
/** Bases that cannot be served hot. */
export const NOT_SERVED_HOT = ["cold-brew"] as const;

export const DELIVERY_FEE_CENTAVOS = 4900;
/** Delivery is free when the subtotal (before discounts) reaches this. */
export const FREE_DELIVERY_MIN_CENTAVOS = 80000;
export const MAX_LINE_QUANTITY = 20;

export type PricingIngredient = {
  slug: string;
  name: string;
  kind: IngredientKind;
  priceCentavos: number;
  /** Shots included in the base price; null when the base takes no shots. */
  includedShots: number | null;
  isActive: boolean;
};

export type PricingSignature = {
  slug: string;
  name: string;
  priceCentavos: number;
  recipe: DrinkConfig;
  isActive: boolean;
};

export type PricingCatalog = {
  ingredients: readonly PricingIngredient[];
  signatures: readonly PricingSignature[];
};

export type PriceLine = {
  kind: IngredientKind | "signature" | "changes";
  slug: string;
  name: string;
  quantity: number;
  /** Line total (unit price × quantity). Negative only for "changes". */
  centavos: number;
};

export type DrinkPrice = {
  unitPriceCentavos: number;
  lines: PriceLine[];
};

export type PricingErrorCode =
  | "invalid_config"
  | "unknown_ingredient"
  | "inactive_ingredient"
  | "wrong_kind"
  | "shots_not_allowed"
  | "temperature_not_allowed"
  | "unknown_signature"
  | "invalid_cart";

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

type IngredientIndex = ReadonlyMap<string, PricingIngredient>;

function pick(
  index: IngredientIndex,
  slug: string,
  kind: IngredientKind,
): PricingIngredient {
  const ingredient = index.get(slug);
  if (!ingredient) {
    throw new PricingError("unknown_ingredient", `Unknown ${kind} "${slug}".`);
  }
  if (ingredient.kind !== kind) {
    throw new PricingError(
      "wrong_kind",
      `"${slug}" is a ${ingredient.kind}, not a ${kind}.`,
    );
  }
  if (!ingredient.isActive) {
    throw new PricingError(
      "inactive_ingredient",
      `${ingredient.name} is not available.`,
    );
  }
  return ingredient;
}

function line(ingredient: PricingIngredient, quantity = 1): PriceLine {
  return {
    kind: ingredient.kind,
    slug: ingredient.slug,
    name: ingredient.name,
    quantity,
    centavos: multiplyCentavos(ingredient.priceCentavos, quantity),
  };
}

/** Prices every part of a drink built from scratch. */
function priceLines(config: DrinkConfig, index: IngredientIndex): PriceLine[] {
  const base = pick(index, config.base, "base");
  const size = pick(index, config.size, "size");
  const temperature = pick(index, config.temperature, "temperature");

  if (
    config.temperature === "hot" &&
    (NOT_SERVED_HOT as readonly string[]).includes(base.slug)
  ) {
    throw new PricingError(
      "temperature_not_allowed",
      `${base.name} cannot be served hot.`,
    );
  }

  const lines = [line(base), line(size), line(temperature)];

  if (base.includedShots === null) {
    if (config.shots !== undefined) {
      throw new PricingError(
        "shots_not_allowed",
        `${base.name} does not take espresso shots.`,
      );
    }
  } else {
    const extraShots = Math.max(
      0,
      (config.shots ?? base.includedShots) - base.includedShots,
    );
    if (extraShots > 0) {
      lines.push(line(pick(index, EXTRA_SHOT_SLUG, "shot"), extraShots));
    }
  }

  lines.push(line(pick(index, config.milk, "milk")));
  for (const slug of config.syrups)
    lines.push(line(pick(index, slug, "syrup")));
  for (const slug of config.toppings) {
    lines.push(line(pick(index, slug, "topping")));
  }
  return lines;
}

function totalOf(lines: readonly PriceLine[]): number {
  return sumCentavos(lines.map((l) => l.centavos));
}

/**
 * The price of one drink.
 *
 * A drink built from scratch costs the sum of its parts. A drink that started
 * from a signature (`config.signature`) costs the signature's menu price plus
 * the price difference of the customer's changes, so an unchanged signature
 * always costs exactly its menu price.
 *
 * Throws a PricingError when the drink is invalid.
 */
export function calculateDrinkPrice(
  config: DrinkConfig,
  catalog: PricingCatalog,
): DrinkPrice {
  const parsed = drinkConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new PricingError(
      "invalid_config",
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  const drink = parsed.data;
  const index: IngredientIndex = new Map(
    catalog.ingredients.map((ingredient) => [ingredient.slug, ingredient]),
  );
  const lines = priceLines(drink, index);

  if (drink.signature === undefined) {
    return { unitPriceCentavos: totalOf(lines), lines };
  }

  const signature = catalog.signatures.find((s) => s.slug === drink.signature);
  if (!signature?.isActive) {
    throw new PricingError(
      "unknown_signature",
      `Unknown signature drink "${drink.signature}".`,
    );
  }
  const changes = totalOf(lines) - totalOf(priceLines(signature.recipe, index));
  const signatureLines: PriceLine[] = [
    {
      kind: "signature",
      slug: signature.slug,
      name: signature.name,
      quantity: 1,
      centavos: signature.priceCentavos,
    },
  ];
  if (changes !== 0) {
    signatureLines.push({
      kind: "changes",
      slug: "changes",
      name: "Your changes",
      quantity: 1,
      centavos: changes,
    });
  }
  return {
    // Removing options can never make a drink cost less than nothing.
    unitPriceCentavos: Math.max(0, signature.priceCentavos + changes),
    lines: signatureLines,
  };
}

export type CartLine = {
  unitPriceCentavos: number;
  quantity: number;
};

export type CartTotals = {
  itemCount: number;
  subtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
};

function isWholeAtLeast(value: number, min: number): boolean {
  return Number.isSafeInteger(value) && value >= min;
}

/**
 * Cart totals. `discountCentavos` comes from a promo code (Stage 8) and is
 * capped at the subtotal. Delivery costs ₱49 unless the subtotal before the
 * discount is ₱800 or more; pickup is always free.
 */
export function calculateCartTotals({
  lines,
  fulfillment,
  discountCentavos = 0,
}: {
  lines: readonly CartLine[];
  fulfillment: BranchService;
  discountCentavos?: number;
}): CartTotals {
  for (const { unitPriceCentavos, quantity } of lines) {
    if (!isWholeAtLeast(unitPriceCentavos, 0)) {
      throw new PricingError(
        "invalid_cart",
        `Invalid unit price ${unitPriceCentavos}.`,
      );
    }
    if (!isWholeAtLeast(quantity, 1) || quantity > MAX_LINE_QUANTITY) {
      throw new PricingError(
        "invalid_cart",
        `Quantity must be between 1 and ${MAX_LINE_QUANTITY}.`,
      );
    }
  }
  if (!isWholeAtLeast(discountCentavos, 0)) {
    throw new PricingError(
      "invalid_cart",
      `Invalid discount ${discountCentavos}.`,
    );
  }

  const subtotalCentavos = sumCentavos(
    lines.map((l) => multiplyCentavos(l.unitPriceCentavos, l.quantity)),
  );
  const discount = Math.min(discountCentavos, subtotalCentavos);
  const deliveryFeeCentavos =
    fulfillment === "delivery" &&
    lines.length > 0 &&
    subtotalCentavos < FREE_DELIVERY_MIN_CENTAVOS
      ? DELIVERY_FEE_CENTAVOS
      : 0;

  return {
    itemCount: lines.reduce((count, l) => count + l.quantity, 0),
    subtotalCentavos,
    discountCentavos: discount,
    deliveryFeeCentavos,
    totalCentavos: subtotalCentavos - discount + deliveryFeeCentavos,
  };
}
