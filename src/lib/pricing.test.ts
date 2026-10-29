import { describe, expect, it } from "vitest";
import type { IngredientKind } from "./catalog";
import {
  calculateCartTotals,
  calculateDrinkPrice,
  DELIVERY_FEE_CENTAVOS,
  FREE_DELIVERY_MIN_CENTAVOS,
  MAX_LINE_QUANTITY,
  PricingError,
  type PricingCatalog,
  type PricingErrorCode,
  type PricingIngredient,
} from "./pricing";
import type { DrinkConfig } from "./validation/drink";

// A slice of the docs/PLAN.md §6 menu, priced in centavos.
function ingredient(
  kind: IngredientKind,
  slug: string,
  pesos: number,
  extra: Partial<PricingIngredient> = {},
): PricingIngredient {
  return {
    slug,
    name: slug,
    kind,
    priceCentavos: pesos * 100,
    includedShots: null,
    isActive: true,
    ...extra,
  };
}

const espressoBased = { includedShots: 1 };

const ingredients: PricingIngredient[] = [
  ingredient("size", "12oz", 0),
  ingredient("size", "16oz", 20),
  ingredient("size", "22oz", 40),
  ingredient("temperature", "hot", 0),
  ingredient("temperature", "iced", 0),
  ingredient("temperature", "blended", 20),
  ingredient("shot", "extra-shot", 40),
  ingredient("base", "espresso", 90, espressoBased),
  ingredient("base", "americano", 110, espressoBased),
  ingredient("base", "latte", 130, espressoBased),
  ingredient("base", "mocha", 150, espressoBased),
  ingredient("base", "cold-brew", 140),
  ingredient("base", "matcha", 150),
  ingredient("base", "ube-milk", 140),
  ingredient("base", "retired-base", 100, { isActive: false }),
  ingredient("milk", "none", 0),
  ingredient("milk", "whole", 0),
  ingredient("milk", "skim", 0),
  ingredient("milk", "soy", 20),
  ingredient("milk", "oat", 30),
  ingredient("milk", "almond", 30),
  ingredient("milk", "coconut", 30),
  ingredient("syrup", "vanilla", 20),
  ingredient("syrup", "caramel", 20),
  ingredient("syrup", "honey", 20),
  ingredient("syrup", "toffee", 20),
  ingredient("topping", "whipped-cream", 20),
  ingredient("topping", "cold-foam", 30),
  ingredient("topping", "sea-salt-cream", 35),
  ingredient("topping", "caramel-drizzle", 15),
  ingredient("topping", "chocolate-drizzle", 15),
  ingredient("topping", "cinnamon-dust", 0),
];

const olympusRecipe: DrinkConfig = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  shots: 1,
  milk: "oat",
  milkAmount: "regular",
  sweetness: 50,
  syrups: ["honey"],
  toppings: ["cinnamon-dust"],
};

const catalog: PricingCatalog = {
  ingredients,
  signatures: [
    // Recipe adds up to ₱180; the menu price is ₱175.
    {
      slug: "olympus-latte",
      name: "Olympus Latte",
      priceCentavos: 17500,
      recipe: olympusRecipe,
      isActive: true,
    },
    {
      slug: "retired-signature",
      name: "Retired",
      priceCentavos: 10000,
      recipe: olympusRecipe,
      isActive: false,
    },
  ],
};

const plainLatte: DrinkConfig = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  milk: "whole",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
};

function price(overrides: Partial<DrinkConfig> = {}, from = plainLatte) {
  return calculateDrinkPrice({ ...from, ...overrides }, catalog)
    .unitPriceCentavos;
}

function errorCode(fn: () => unknown): PricingErrorCode {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PricingError);
    return (error as PricingError).code;
  }
  throw new Error("Expected a PricingError");
}

function priceError(overrides: Partial<DrinkConfig>, c = catalog) {
  return errorCode(() =>
    calculateDrinkPrice({ ...plainLatte, ...overrides }, c),
  );
}

describe("calculateDrinkPrice: drinks built from scratch", () => {
  it("prices a 12oz hot latte with whole milk at the base price", () => {
    expect(price()).toBe(13000);
  });

  it.each([
    ["12oz", 13000],
    ["16oz", 15000],
    ["22oz", 17000],
  ] as const)("adds the %s size price", (size, expected) => {
    expect(price({ size })).toBe(expected);
  });

  it.each([
    ["hot", 13000],
    ["iced", 13000],
    ["blended", 15000],
  ] as const)("adds the %s temperature price", (temperature, expected) => {
    expect(price({ temperature })).toBe(expected);
  });

  it("charges nothing for the ice level", () => {
    expect(price({ temperature: "iced", iceLevel: "extra" })).toBe(13000);
  });

  it.each([
    [undefined, 13000],
    [1, 13000],
    [2, 17000],
    [3, 21000],
    [4, 25000],
  ])("with %s shots costs %i", (shots, expected) => {
    expect(price({ shots })).toBe(expected);
  });

  it.each([
    ["none", 13000],
    ["whole", 13000],
    ["skim", 13000],
    ["soy", 15000],
    ["oat", 16000],
    ["almond", 16000],
    ["coconut", 16000],
  ])("adds the %s milk price", (milk, expected) => {
    expect(price({ milk })).toBe(expected);
  });

  it("charges nothing for milk amount or sweetness", () => {
    expect(price({ milkAmount: "extra", sweetness: 100 })).toBe(13000);
    expect(price({ milkAmount: "light", sweetness: 0 })).toBe(13000);
  });

  it("adds ₱20 per syrup", () => {
    expect(price({ syrups: ["vanilla"] })).toBe(15000);
    expect(price({ syrups: ["vanilla", "caramel"] })).toBe(17000);
    expect(price({ syrups: ["vanilla", "caramel", "toffee"] })).toBe(19000);
  });

  it("adds each topping's own price, including free ones", () => {
    expect(price({ toppings: ["cinnamon-dust"] })).toBe(13000);
    expect(price({ toppings: ["sea-salt-cream"] })).toBe(16500);
    expect(
      price({
        toppings: [
          "whipped-cream",
          "cold-foam",
          "caramel-drizzle",
          "chocolate-drizzle",
          "cinnamon-dust",
        ],
      }),
    ).toBe(13000 + 2000 + 3000 + 1500 + 1500);
  });

  it("adds everything together for a fully loaded drink", () => {
    // Mocha 150 + 22oz 40 + blended 20 + 3 extra shots 120 + oat 30
    // + 3 syrups 60 + toppings 20 + 30 + 35 + 15 + 15 = ₱535
    expect(
      price({
        base: "mocha",
        size: "22oz",
        temperature: "blended",
        shots: 4,
        milk: "oat",
        syrups: ["vanilla", "caramel", "honey"],
        toppings: [
          "whipped-cream",
          "cold-foam",
          "sea-salt-cream",
          "caramel-drizzle",
          "chocolate-drizzle",
        ],
      }),
    ).toBe(53500);
  });

  it("prices non-coffee bases without shots", () => {
    expect(price({ base: "matcha", milk: "oat" })).toBe(18000);
    expect(price({ base: "ube-milk", milk: "none" })).toBe(14000);
  });

  it("returns a line-by-line breakdown that adds up to the price", () => {
    const result = calculateDrinkPrice(
      { ...plainLatte, size: "16oz", shots: 3, syrups: ["vanilla"] },
      catalog,
    );
    expect(
      result.lines.map((l) => [l.kind, l.slug, l.quantity, l.centavos]),
    ).toEqual([
      ["base", "latte", 1, 13000],
      ["size", "16oz", 1, 2000],
      ["temperature", "hot", 1, 0],
      ["shot", "extra-shot", 2, 8000],
      ["milk", "whole", 1, 0],
      ["syrup", "vanilla", 1, 2000],
    ]);
    expect(result.lines.reduce((t, l) => t + l.centavos, 0)).toBe(
      result.unitPriceCentavos,
    );
  });

  it("ignores the drink's name", () => {
    expect(price({ name: "Monday Fuel" })).toBe(13000);
  });
});

describe("calculateDrinkPrice: signature drinks", () => {
  const olympus = { ...olympusRecipe, signature: "olympus-latte" };

  it("charges the menu price when nothing is changed", () => {
    const result = calculateDrinkPrice(olympus, catalog);
    expect(result.unitPriceCentavos).toBe(17500);
    expect(result.lines).toEqual([
      {
        kind: "signature",
        slug: "olympus-latte",
        name: "Olympus Latte",
        quantity: 1,
        centavos: 17500,
      },
    ]);
  });

  it("adds the price of extras to the menu price", () => {
    const result = calculateDrinkPrice(
      { ...olympus, size: "16oz", syrups: ["honey", "vanilla"] },
      catalog,
    );
    expect(result.unitPriceCentavos).toBe(17500 + 2000 + 2000);
    expect(result.lines[1]).toMatchObject({ kind: "changes", centavos: 4000 });
  });

  it("subtracts the difference when a cheaper option is chosen", () => {
    expect(price({ milk: "soy" }, olympus)).toBe(16500);
    expect(price({ milk: "whole", syrups: [] }, olympus)).toBe(12500);
  });

  it("does not change the price for a free swap", () => {
    expect(price({ temperature: "iced", sweetness: 0 }, olympus)).toBe(17500);
  });

  it("never goes below zero", () => {
    const cheap: PricingCatalog = {
      ingredients,
      signatures: [
        {
          slug: "olympus-latte",
          name: "Olympus Latte",
          priceCentavos: 1000,
          recipe: olympusRecipe,
          isActive: true,
        },
      ],
    };
    expect(
      calculateDrinkPrice(
        { ...olympus, base: "espresso", milk: "none", syrups: [] },
        cheap,
      ).unitPriceCentavos,
    ).toBe(0);
  });

  it("rejects an unknown or retired signature", () => {
    expect(priceError({ signature: "no-such-drink" })).toBe(
      "unknown_signature",
    );
    expect(priceError({ signature: "retired-signature" })).toBe(
      "unknown_signature",
    );
  });

  it("still checks the customer's changes", () => {
    expect(priceError({ signature: "olympus-latte", milk: "mystery" })).toBe(
      "unknown_ingredient",
    );
  });
});

describe("calculateDrinkPrice: invalid drinks", () => {
  it("rejects configs that break the schema", () => {
    // Any number of syrups and toppings is fine, but repeats and junk-sized
    // lists (over the safety cap) are not.
    const junk = Array.from({ length: 31 }, (_, i) => `item-${i}`);
    expect(priceError({ syrups: junk })).toBe("invalid_config");
    expect(priceError({ toppings: junk })).toBe("invalid_config");
    expect(priceError({ syrups: ["vanilla", "vanilla"] })).toBe(
      "invalid_config",
    );
    expect(priceError({ shots: 5 })).toBe("invalid_config");
    expect(priceError({ iceLevel: "light" })).toBe("invalid_config");
    expect(
      errorCode(() =>
        calculateDrinkPrice(
          { ...plainLatte, priceCentavos: 1 } as DrinkConfig,
          catalog,
        ),
      ),
    ).toBe("invalid_config");
  });

  it("reports the schema's message", () => {
    expect(() =>
      calculateDrinkPrice(
        { ...plainLatte, syrups: ["vanilla", "vanilla"] },
        catalog,
      ),
    ).toThrow("Each syrup can only be added once.");
  });

  it.each([
    ["base", { base: "unicorn-latte" }],
    ["milk", { milk: "goat" }],
    ["syrup", { syrups: ["lavender"] }],
    ["topping", { toppings: ["sprinkles"] }],
  ])("rejects an unknown %s", (_kind, overrides) => {
    expect(priceError(overrides)).toBe("unknown_ingredient");
  });

  it("rejects an ingredient used as the wrong kind", () => {
    expect(priceError({ base: "oat" })).toBe("wrong_kind");
    expect(priceError({ milk: "vanilla" })).toBe("wrong_kind");
    expect(priceError({ syrups: ["cold-foam"] })).toBe("wrong_kind");
    expect(priceError({ toppings: ["honey"] })).toBe("wrong_kind");
  });

  it("rejects an inactive ingredient", () => {
    expect(priceError({ base: "retired-base" })).toBe("inactive_ingredient");
  });

  it("rejects shots on a base that takes none", () => {
    expect(priceError({ base: "matcha", shots: 1 })).toBe("shots_not_allowed");
    expect(
      priceError({ base: "cold-brew", temperature: "iced", shots: 2 }),
    ).toBe("shots_not_allowed");
  });

  it("rejects a hot cold brew but allows iced or blended", () => {
    expect(priceError({ base: "cold-brew", milk: "none" })).toBe(
      "temperature_not_allowed",
    );
    expect(price({ base: "cold-brew", temperature: "iced" })).toBe(14000);
    expect(price({ base: "cold-brew", temperature: "blended" })).toBe(16000);
  });

  it("fails clearly when the size, temperature or shot price is missing", () => {
    const without = (slug: string): PricingCatalog => ({
      ...catalog,
      ingredients: ingredients.filter((i) => i.slug !== slug),
    });
    expect(priceError({}, without("12oz"))).toBe("unknown_ingredient");
    expect(priceError({}, without("hot"))).toBe("unknown_ingredient");
    expect(priceError({ shots: 2 }, without("extra-shot"))).toBe(
      "unknown_ingredient",
    );
    // One included shot needs no extra-shot price.
    expect(
      calculateDrinkPrice(plainLatte, without("extra-shot")).unitPriceCentavos,
    ).toBe(13000);
  });

  it("is a named Error with a readable message", () => {
    try {
      calculateDrinkPrice({ ...plainLatte, base: "matcha", shots: 2 }, catalog);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("PricingError");
      expect((error as Error).message).toBe(
        "matcha does not take espresso shots.",
      );
    }
    expect.assertions(3);
  });
});

describe("calculateCartTotals", () => {
  const latte = { unitPriceCentavos: 17500, quantity: 1 };

  it("adds line totals for pickup with no delivery fee", () => {
    expect(
      calculateCartTotals({
        lines: [latte, { unitPriceCentavos: 9500, quantity: 2 }],
        fulfillment: "pickup",
      }),
    ).toEqual({
      itemCount: 3,
      subtotalCentavos: 36500,
      discountCentavos: 0,
      deliveryFeeCentavos: 0,
      totalCentavos: 36500,
    });
  });

  it("adds the ₱49 delivery fee below ₱800", () => {
    const totals = calculateCartTotals({
      lines: [latte],
      fulfillment: "delivery",
    });
    expect(totals.deliveryFeeCentavos).toBe(DELIVERY_FEE_CENTAVOS);
    expect(totals.totalCentavos).toBe(17500 + 4900);
  });

  it.each([
    [FREE_DELIVERY_MIN_CENTAVOS - 1, DELIVERY_FEE_CENTAVOS],
    [FREE_DELIVERY_MIN_CENTAVOS, 0],
    [FREE_DELIVERY_MIN_CENTAVOS + 1, 0],
  ])("a %i subtotal has a %i delivery fee", (subtotal, fee) => {
    expect(
      calculateCartTotals({
        lines: [{ unitPriceCentavos: subtotal, quantity: 1 }],
        fulfillment: "delivery",
      }).deliveryFeeCentavos,
    ).toBe(fee);
  });

  it("decides free delivery on the subtotal before the discount", () => {
    const totals = calculateCartTotals({
      lines: [{ unitPriceCentavos: 40000, quantity: 2 }],
      fulfillment: "delivery",
      discountCentavos: 10000,
    });
    expect(totals).toMatchObject({
      subtotalCentavos: 80000,
      discountCentavos: 10000,
      deliveryFeeCentavos: 0,
      totalCentavos: 70000,
    });
  });

  it("applies a discount", () => {
    expect(
      calculateCartTotals({
        lines: [latte],
        fulfillment: "pickup",
        discountCentavos: 5000,
      }).totalCentavos,
    ).toBe(12500);
  });

  it("caps the discount at the subtotal but still charges delivery", () => {
    expect(
      calculateCartTotals({
        lines: [latte],
        fulfillment: "delivery",
        discountCentavos: 99999,
      }),
    ).toMatchObject({
      discountCentavos: 17500,
      deliveryFeeCentavos: 4900,
      totalCentavos: 4900,
    });
  });

  it("returns zeros for an empty cart, with no delivery fee", () => {
    expect(calculateCartTotals({ lines: [], fulfillment: "delivery" })).toEqual(
      {
        itemCount: 0,
        subtotalCentavos: 0,
        discountCentavos: 0,
        deliveryFeeCentavos: 0,
        totalCentavos: 0,
      },
    );
  });

  it(`allows up to ${MAX_LINE_QUANTITY} of one item`, () => {
    expect(
      calculateCartTotals({
        lines: [{ unitPriceCentavos: 6000, quantity: MAX_LINE_QUANTITY }],
        fulfillment: "pickup",
      }).subtotalCentavos,
    ).toBe(6000 * MAX_LINE_QUANTITY);
  });

  it.each([0, -1, 1.5, MAX_LINE_QUANTITY + 1, Number.NaN])(
    "rejects quantity %s",
    (quantity) => {
      expect(
        errorCode(() =>
          calculateCartTotals({
            lines: [{ unitPriceCentavos: 17500, quantity }],
            fulfillment: "pickup",
          }),
        ),
      ).toBe("invalid_cart");
    },
  );

  it.each([-100, 175.5, Number.NaN])("rejects unit price %s", (unit) => {
    expect(
      errorCode(() =>
        calculateCartTotals({
          lines: [{ unitPriceCentavos: unit, quantity: 1 }],
          fulfillment: "pickup",
        }),
      ),
    ).toBe("invalid_cart");
  });

  it.each([-1, 0.5])("rejects discount %s", (discountCentavos) => {
    expect(
      errorCode(() =>
        calculateCartTotals({
          lines: [latte],
          fulfillment: "pickup",
          discountCentavos,
        }),
      ),
    ).toBe("invalid_cart");
  });
});
