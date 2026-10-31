import { describe, expect, it } from "vitest";
import type { CartItem } from "./cart";
import { pointsEarned, rewardForItem } from "./points";
import type { DrinkConfig } from "./validation/drink";
import { seedSnapshot } from "@/test/catalog-fixture";

const snapshot = seedSnapshot();
const recipe = snapshot.products.find(
  (p) => p.slug === "olympus-latte",
)!.recipe!;

const drink = (config: Partial<DrinkConfig>): CartItem => ({
  id: "d",
  kind: "custom",
  quantity: 2,
  config: {
    size: "12oz",
    temperature: "hot",
    base: "latte",
    milk: "whole",
    milkAmount: "regular",
    sweetness: 50,
    syrups: [],
    toppings: [],
    ...config,
  },
});

describe("pointsEarned", () => {
  it.each([
    [10000, 0, 10],
    [10999, 0, 10],
    [999, 0, 0],
    [10000, 5000, 5],
    [5000, 5000, 0],
    [5000, 9000, 0],
  ])("%i minus %i earns %i", (subtotal, discount, points) => {
    expect(pointsEarned(subtotal, discount)).toBe(points);
  });
});

describe("rewardForItem", () => {
  it("makes a menu signature free at its menu price", () => {
    expect(
      rewardForItem(
        {
          id: "s",
          kind: "product",
          productSlug: "olympus-latte",
          quantity: 1,
        },
        snapshot,
      ),
    ).toEqual({ points: 150, valueCentavos: 17500 });
  });

  it.each(["butter-croissant", "chicken-pesto-panini", "no-such-item"])(
    "gives nothing for %s",
    (productSlug) => {
      expect(
        rewardForItem(
          { id: "p", kind: "product", productSlug, quantity: 1 },
          snapshot,
        ),
      ).toBeNull();
    },
  );

  it.each([
    ["12oz", 150, 13000],
    ["16oz", 250, 15000],
    ["22oz", 350, 17000],
  ] as const)(
    "frees a built %s drink's base and size",
    (size, points, value) => {
      expect(rewardForItem(drink({ size }), snapshot)).toEqual({
        points,
        valueCentavos: value,
      });
    },
  );

  it("still charges add-ons on a built drink", () => {
    expect(
      rewardForItem(
        drink({ milk: "oat", syrups: ["vanilla"], toppings: ["cold-foam"] }),
        snapshot,
      ),
    ).toEqual({ points: 150, valueCentavos: 13000 });
  });

  it("frees a customized signature's menu price at the chosen size", () => {
    expect(
      rewardForItem(
        drink({ ...recipe, signature: "olympus-latte", size: "16oz" }),
        snapshot,
      ),
    ).toEqual({ points: 250, valueCentavos: 19500 });
  });

  it("never frees more than the drink costs", () => {
    const reward = rewardForItem(
      drink({
        ...recipe,
        signature: "olympus-latte",
        milk: "whole",
        syrups: [],
        toppings: [],
      }),
      snapshot,
    );
    expect(reward?.valueCentavos).toBeLessThan(17500);
  });

  it("gives nothing for a drink that can't be priced", () => {
    expect(rewardForItem(drink({ base: "moon-dust" }), snapshot)).toBeNull();
  });

  it("passes on errors that aren't about pricing", () => {
    const broken = {
      ...snapshot,
      get ingredients(): never {
        throw new Error("boom");
      },
    };
    expect(() => rewardForItem(drink({}), broken)).toThrow("boom");
  });
});
