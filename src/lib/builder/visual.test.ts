import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { toBuilderCatalog } from "./catalog";
import { EMPTY_DRAFT, type BuilderDraft } from "./state";
import {
  BRIM_SHARE,
  cupLayers,
  cupScale,
  describeDrink,
  FALLBACK_LIQUID_COLOR,
  foamReserve,
  iceCubeCount,
  mixColor,
  scatter,
  seedOf,
  shade,
  stackLayers,
  toppingLayout,
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
    expect(layers[2]).toMatchObject({
      key: "base",
      slug: "latte",
      name: "Latte",
      color: "#5A3825",
    });
    expect(layers[3]!.color).toBe("#E9D7B5");
  });

  const total = (layers: LiquidLayer[]) =>
    layers.reduce((sum, l) => sum + l.share, 0);
  const share = (draft: BuilderDraft, key: string) =>
    cupLayers(draft, catalog).find((l) => l.key === key)!.share;

  it("pours the base to about half the cup while the drink is being built", () => {
    expect(share({ ...latte, milk: null }, "base")).toBeCloseTo(0.4);
    expect(share({ ...latte, milk: null, shots: 3 }, "base")).toBeCloseTo(0.48);
  });

  it("fills a finished drink to the brim, whatever it contains", () => {
    for (const draft of [
      latte,
      { ...latte, syrups: ["vanilla", "honey", "caramel"] },
      { ...latte, milk: "none" },
      { ...latte, milkAmount: "extra" as const, shots: 4 },
      { ...EMPTY_DRAFT, base: "cold-brew", milk: "none" },
    ]) {
      expect(total(cupLayers(draft, catalog))).toBeCloseTo(BRIM_SHARE);
    }
    expect(cupLayers({ ...latte, milk: "none" }, catalog)).toHaveLength(1);
  });

  it("keeps the syrups a thin band, however many are chosen", () => {
    const syrupTotal = (syrups: string[]) =>
      cupLayers({ ...latte, milk: null, syrups }, catalog)
        .filter((l) => l.key.startsWith("syrup:"))
        .reduce((sum, l) => sum + l.share, 0);
    expect(syrupTotal(["vanilla"])).toBeCloseTo(0.03);
    expect(syrupTotal(["vanilla", "caramel", "honey"])).toBeCloseTo(0.09);
    expect(syrupTotal(catalog.syrups.map((s) => s.slug))).toBeCloseTo(0.09);
  });

  it("stops lower when told to, leaving room for foam", () => {
    expect(total(cupLayers(latte, catalog, 0.8))).toBeCloseTo(0.8);
  });

  it("keeps the proportions: more milk, or more shots, take more of the cup", () => {
    const milk = (amount: BuilderDraft["milkAmount"]) =>
      share({ ...latte, milkAmount: amount }, "milk");
    expect(milk("light")).toBeLessThan(milk("regular"));
    expect(milk("regular")).toBeLessThan(milk("extra"));
    expect(share({ ...latte, shots: 3 }, "base")).toBeGreaterThan(
      share(latte, "base"),
    );
    // Latte with regular milk: 0.4 coffee to 0.3 milk.
    expect(share(latte, "base") / share(latte, "milk")).toBeCloseTo(0.4 / 0.3);
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
    const scale = BRIM_SHARE / (0.03 + 0.4 + 0.3);
    expect(below[0]).toBe(0);
    expect(below[1]).toBeCloseTo(0.03 * scale);
    expect(below[2]).toBeCloseTo(0.43 * scale);
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
  it("gives each topping its own style", () => {
    expect(
      toppingVisuals(
        [
          "whipped-cream",
          "cold-foam",
          "caramel-drizzle",
          "cocoa-powder",
          "cookie-crumble",
          "tapioca-pearls",
        ],
        catalog,
      ).map((t) => t.style),
    ).toEqual(["dollop", "foam", "drizzle", "dust", "crumble", "pieces"]);
  });

  it("dusts unknown toppings with a fallback colour", () => {
    expect(toppingVisuals(["stardust"], catalog)).toEqual([
      { slug: "stardust", style: "dust", color: FALLBACK_LIQUID_COLOR },
    ]);
  });
});

describe("foamReserve", () => {
  it("saves room at the top for each foam", () => {
    const visuals = (slugs: string[]) => toppingVisuals(slugs, catalog);
    expect(foamReserve(visuals(["whipped-cream", "cocoa-powder"]), 120)).toBe(
      0,
    );
    expect(foamReserve(visuals(["cold-foam"]), 120)).toBeCloseTo(0.1);
    expect(
      foamReserve(visuals(["cold-foam", "sea-salt-cream"]), 120),
    ).toBeCloseTo(0.2);
  });
});

describe("toppingLayout", () => {
  const visuals = (slugs: string[]) => toppingVisuals(slugs, catalog);

  it("puts drizzles straight on the drink when there is nothing else", () => {
    expect(toppingLayout(visuals(["caramel-drizzle"]), 120, 60)).toEqual({
      foamTop: 120,
      dollopBase: null,
      dollopTop: null,
      crown: 120,
      crownSpan: [46, 154],
    });
  });

  it("stacks foams, and rests whipped cream on a drink that isn't full", () => {
    const layout = toppingLayout(
      visuals(["cold-foam", "sea-salt-cream", "whipped-cream"]),
      120,
      60,
    );
    expect(layout.foamTop).toBe(96);
    expect(layout.dollopBase).toBe(96);
    expect(layout.dollopTop).toBe(50);
    expect(layout.crown).toBe(70);
    expect(layout.crownSpan).toEqual([72, 128]);
  });

  it("sits whipped cream on the rim of a full drink", () => {
    // The drink's top is 4 units under the glass top (y 95): a full cup.
    const layout = toppingLayout(
      visuals(["whipped-cream", "chocolate-drizzle"]),
      99,
      95,
    );
    expect(layout.foamTop).toBe(99);
    // On the rim line, which is drawn 2 units above the glass top.
    expect(layout.dollopBase).toBe(93);
    expect(layout.dollopTop).toBe(93 - 46);
    expect(layout.crown).toBe(93 - 26);
  });
});

describe("shade", () => {
  it("lightens towards white and darkens towards black", () => {
    expect(shade("#806040", 0.5)).toBe("#C0B0A0");
    expect(shade("#806040", -0.5)).toBe("#403020");
    expect(shade("#806040", 0)).toBe("#806040");
    expect(shade("#806040", 2)).toBe("#FFFFFF");
    expect(shade("#806040", -2)).toBe("#000000");
  });
});

describe("scatter", () => {
  it("gives the same points for the same seed, all between 0 and 1", () => {
    const points = scatter(50, seedOf("cocoa-powder"));
    expect(points).toEqual(scatter(50, seedOf("cocoa-powder")));
    expect(points).not.toEqual(scatter(50, seedOf("cinnamon-dust")));
    for (const p of points) {
      for (const value of [p.x, p.y, p.size]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
    expect(scatter(3, 0)).toHaveLength(3);
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
