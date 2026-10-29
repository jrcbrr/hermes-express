import { describe, expect, it } from "vitest";
import { calculateDrinkPrice } from "@/lib/pricing";
import { drinkConfigSchema } from "@/lib/validation/drink";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { toBuilderCatalog, type BuilderCatalog } from "./catalog";
import { randomDrink, type Rng } from "./random";

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);

/** A small seeded generator (mulberry32), so every run picks the same drinks. */
function seeded(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("randomDrink", () => {
  it("always makes a valid drink that can be priced", () => {
    const rng = seeded(42);
    const bases = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const drink = randomDrink(catalog, new Set(), rng)!;
      expect(drinkConfigSchema.safeParse(drink).success).toBe(true);
      expect(() => calculateDrinkPrice(drink, catalog.pricing)).not.toThrow();
      expect(drink.syrups.length).toBeLessThanOrEqual(2);
      expect(drink.toppings.length).toBeLessThanOrEqual(3);
      if (drink.base === "cold-brew") expect(drink.temperature).not.toBe("hot");
      bases.add(drink.base);
    }
    // Plenty of variety.
    expect(bases.size).toBeGreaterThan(10);
  });

  it("never picks an option that is sold out", () => {
    const soldOut = new Set(["latte", "oat", "vanilla", "cold-foam", "22oz"]);
    const rng = seeded(7);
    for (let i = 0; i < 300; i++) {
      const drink = randomDrink(catalog, soldOut, rng)!;
      const used = [
        drink.size,
        drink.base,
        drink.milk,
        ...drink.syrups,
        ...drink.toppings,
      ];
      expect(used.some((slug) => soldOut.has(slug))).toBe(false);
    }
  });

  it("is repeatable with the same random numbers", () => {
    expect(randomDrink(catalog, new Set(), seeded(1))).toEqual(
      randomDrink(catalog, new Set(), seeded(1)),
    );
  });

  it("serves Cold Brew cold when it is the only base left", () => {
    const only: BuilderCatalog = {
      ...catalog,
      bases: catalog.bases.filter((b) => b.slug === "cold-brew"),
    };
    const drink = randomDrink(only, new Set(), () => 0)!;
    expect(drink.base).toBe("cold-brew");
    expect(drink.temperature).toBe("iced");
    expect(drink.iceLevel).toBe("light");
    expect(drink.shots).toBeUndefined();
  });

  it("returns null when a required choice has nothing left", () => {
    const hotOnly: BuilderCatalog = {
      ...catalog,
      temperatures: catalog.temperatures.filter((t) => t.slug === "hot"),
      bases: catalog.bases.filter((b) => b.slug === "cold-brew"),
    };
    expect(randomDrink(hotOnly, new Set())).toBeNull();
    const milks = new Set(catalog.milks.map((m) => m.slug));
    expect(randomDrink(catalog, milks)).toBeNull();
  });

  it("keeps the included shots when extra shots are unavailable", () => {
    const noShot: BuilderCatalog = { ...catalog, extraShotCentavos: null };
    const rng = seeded(3);
    for (let i = 0; i < 100; i++) {
      const drink = randomDrink(noShot, new Set(), rng)!;
      if (drink.shots !== undefined) expect(drink.shots).toBe(1);
    }
  });

  it("adds at most one extra shot to espresso bases", () => {
    const latteOnly: BuilderCatalog = {
      ...catalog,
      bases: catalog.bases.filter((b) => b.slug === "latte"),
    };
    expect(randomDrink(latteOnly, new Set(), () => 0.99)!.shots).toBe(2);
    expect(randomDrink(latteOnly, new Set(), () => 0)!.shots).toBe(1);
  });
});
