import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { optionIndex, toBuilderCatalog } from "./catalog";

describe("toBuilderCatalog", () => {
  it("groups the active options of each step in menu order", () => {
    const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);
    expect(catalog.sizes.map((s) => s.slug)).toEqual(["12oz", "16oz", "22oz"]);
    expect(catalog.temperatures.map((t) => t.slug)).toEqual([
      "hot",
      "iced",
      "blended",
    ]);
    expect(catalog.bases).toHaveLength(15);
    expect(catalog.milks).toHaveLength(7);
    expect(catalog.syrups).toHaveLength(10);
    expect(catalog.toppings).toHaveLength(11);
    expect(catalog.bases[0]).toEqual({
      slug: "espresso",
      name: "Espresso",
      priceCentavos: 9000,
      color: "#3B2416",
      includedShots: 1,
    });
    expect(catalog.extraShotCentavos).toBe(4000);
    expect(catalog.signatures.map((s) => s.slug)).toContain("olympus-latte");
    expect(catalog.pricing.ingredients.length).toBeGreaterThan(40);
  });

  it("drops inactive options, unknown sizes and drinks outside their dates", () => {
    const snapshot = seedSnapshot();
    snapshot.ingredients = snapshot.ingredients.map((i) =>
      i.slug === "oat" || i.slug === "extra-shot"
        ? { ...i, isActive: false }
        : i,
    );
    snapshot.ingredients.push({
      ...snapshot.ingredients[0]!,
      id: "i-30oz",
      slug: "30oz",
    });
    snapshot.products = snapshot.products.map((p) =>
      p.slug === "winged-mocha"
        ? { ...p, availableTo: new Date("2026-01-01") }
        : p,
    );
    const catalog = toBuilderCatalog(snapshot, FIXTURE_NOW);
    expect(catalog.milks.map((m) => m.slug)).not.toContain("oat");
    expect(catalog.sizes.map((s) => s.slug)).not.toContain("30oz");
    expect(catalog.extraShotCentavos).toBeNull();
    expect(catalog.signatures.map((s) => s.slug)).not.toContain("winged-mocha");
  });
});

describe("optionIndex", () => {
  it("finds any option by slug", () => {
    const index = optionIndex(toBuilderCatalog(seedSnapshot(), FIXTURE_NOW));
    expect(index.get("oat")?.name).toBe("Oat milk");
    expect(index.get("iced")?.name).toBe("Iced");
    expect(index.get("cold-foam")?.priceCentavos).toBe(3000);
  });
});
