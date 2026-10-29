import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { toBuilderCatalog } from "./catalog";
import { EMPTY_DRAFT, type BuilderDraft } from "./state";
import {
  cupLayers,
  cupScale,
  describeDrink,
  FALLBACK_LIQUID_COLOR,
  iceCubeCount,
  mixColor,
  stackLayers,
  toppingVisuals,
  type LiquidLayer,
} from "./visual";

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);
const latte: BuilderDraft = {
  ...EMPTY_DRAFT,
  base: "latte",
  shots: 1,
  milk: "oat",
};

describe("cupLayers", () => {
  it("is empty until a base is chosen", () => {
    expect(cupLayers(EMPTY_DRAFT, catalog)).toEqual([]);
  });

  it("stacks syrups, then the base, then milk, with ingredient colours", () => {
    const layers = cupLayers(
      { ...latte, syrups: ["vanilla", "honey"] },
      catalog,
    );
    expect(layers.map((l) => l.key)).toEqual([
      "syrup:vanilla",
      "syrup:honey",
      "base",
      "milk",
    ]);
    expect(layers[2]).toEqual({
      key: "base",
      slug: "latte",
      name: "Latte",
      color: "#5A3825",
      share: 0.4,
    });
    expect(layers[3]!.color).toBe("#E9D7B5");
    expect(layers.reduce((s, l) => s + l.share, 0)).toBeLessThan(0.9);
  });

  it("makes the base taller for extra shots and when there is no milk", () => {
    const base = (draft: BuilderDraft) =>
      cupLayers(draft, catalog).find((l) => l.key === "base")!.share;
    expect(base({ ...latte, shots: 3 })).toBeCloseTo(0.48);
    expect(base({ ...latte, milk: "none" })).toBeCloseTo(0.72);
    expect(base({ ...latte, milk: null })).toBeCloseTo(0.4);
    expect(base({ ...EMPTY_DRAFT, base: "matcha", milk: "none" })).toBeCloseTo(
      0.72,
    );
  });

  it("follows the milk amount", () => {
    const milk = (amount: BuilderDraft["milkAmount"]) =>
      cupLayers({ ...latte, milkAmount: amount }, catalog).at(-1)!.share;
    expect([milk("light"), milk("regular"), milk("extra")]).toEqual([
      0.2, 0.3, 0.38,
    ]);
  });

  it("uses a fallback colour and the slug for unknown ingredients", () => {
    const [layer] = cupLayers({ ...EMPTY_DRAFT, base: "mystery" }, catalog);
    expect(layer).toMatchObject({
      name: "mystery",
      color: FALLBACK_LIQUID_COLOR,
    });
  });
});

describe("stackLayers", () => {
  it("knows how much of the cup is filled below each layer", () => {
    const below = stackLayers(
      cupLayers({ ...latte, syrups: ["vanilla"] }, catalog),
    ).map((s) => s.below);
    expect(below[0]).toBe(0);
    expect(below[1]).toBeCloseTo(0.03);
    expect(below[2]).toBeCloseTo(0.43);
  });
});

describe("mixColor", () => {
  const layer = (color: string, share: number): LiquidLayer => ({
    key: color,
    slug: color,
    name: color,
    color,
    share,
  });

  it("averages colours by height", () => {
    expect(mixColor([layer("#000000", 1), layer("#FFFFFF", 1)])).toBe(
      "#808080",
    );
    expect(mixColor([layer("#FF0000", 3), layer("#0000FF", 1)])).toBe(
      "#BF0040",
    );
  });

  it("is null for an empty cup", () => {
    expect(mixColor([])).toBeNull();
  });
});

describe("toppingVisuals", () => {
  it("draws foams, drizzles, sprinkles and bottom pieces", () => {
    expect(
      toppingVisuals(
        ["cold-foam", "caramel-drizzle", "cocoa-powder", "tapioca-pearls"],
        catalog,
      ).map((t) => t.style),
    ).toEqual(["foam", "drizzle", "sprinkle", "bottom"]);
  });

  it("sprinkles unknown toppings with a fallback colour", () => {
    expect(toppingVisuals(["stardust"], catalog)).toEqual([
      { slug: "stardust", style: "sprinkle", color: FALLBACK_LIQUID_COLOR },
    ]);
  });
});

describe("ice and size", () => {
  it("adds more cubes for more ice", () => {
    expect(
      [undefined, "light", "regular", "extra"].map((l) =>
        iceCubeCount(l as BuilderDraft["iceLevel"]),
      ),
    ).toEqual([0, 2, 3, 5]);
  });

  it("scales the cup with its size", () => {
    expect(cupScale("12oz")).toBeLessThan(cupScale("16oz"));
    expect(cupScale("22oz")).toBe(1);
  });
});

describe("describeDrink", () => {
  it("describes the cup for screen readers", () => {
    expect(describeDrink(EMPTY_DRAFT, catalog)).toBe("An empty 12oz cup");
    expect(
      describeDrink(
        {
          ...latte,
          size: "16oz",
          temperature: "iced",
          toppings: ["cold-foam", "cinnamon-dust"],
        },
        catalog,
      ),
    ).toBe(
      "16oz iced Latte with Oat milk topped with Cold Foam, Cinnamon Dust",
    );
    expect(
      describeDrink({ ...latte, base: "mystery", milk: "none" }, catalog),
    ).toBe("12oz hot mystery");
  });
});
