import { describe, expect, it } from "vitest";
import { calculateDrinkPrice, type PricingCatalog } from "@/lib/pricing";
import { drinkConfigSchema } from "@/lib/validation/drink";
import {
  ingredientSeeds,
  productSeeds,
  promoSeeds,
  stockSeeds,
} from "./catalog-data";
import { siteConfig } from "@/config/site";

const signatures = productSeeds.filter((p) => p.type === "signature");

const pricingCatalog: PricingCatalog = {
  ingredients: ingredientSeeds.map((i) => ({
    slug: i.slug,
    name: i.name,
    kind: i.kind,
    priceCentavos: i.priceCentavos,
    includedShots: i.includedShots ?? null,
    isActive: true,
  })),
  signatures: signatures.map((s) => ({
    slug: s.slug,
    name: s.name,
    priceCentavos: s.priceCentavos,
    recipe: s.recipe!,
    isActive: true,
  })),
};

function count(kind: string) {
  return ingredientSeeds.filter((i) => i.kind === kind).length;
}

describe("catalog seed data (docs/PLAN.md §6)", () => {
  it("has every option from the plan", () => {
    expect(count("size")).toBe(3);
    expect(count("temperature")).toBe(3);
    expect(count("base")).toBe(15);
    expect(count("milk")).toBe(7);
    expect(count("syrup")).toBe(10);
    expect(count("topping")).toBe(11);
    expect(count("shot")).toBe(1);
    expect(signatures).toHaveLength(6);
    expect(productSeeds.filter((p) => p.type === "pastry")).toHaveLength(7);
    expect(productSeeds.filter((p) => p.type === "snack")).toHaveLength(3);
    expect(promoSeeds.map((p) => p.code)).toEqual([
      "FIRSTSIP",
      "HERMES10",
      "OLYMPUS20",
    ]);
  });

  it("uses unique slugs", () => {
    const ingredientSlugs = ingredientSeeds.map((i) => i.slug);
    const productSlugs = productSeeds.map((p) => p.slug);
    expect(new Set(ingredientSlugs).size).toBe(ingredientSlugs.length);
    expect(new Set(productSlugs).size).toBe(productSlugs.length);
  });

  it("stores every price as non-negative integer centavos", () => {
    for (const item of [...ingredientSeeds, ...productSeeds]) {
      expect(Number.isSafeInteger(item.priceCentavos)).toBe(true);
      expect(item.priceCentavos).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every liquid and topping a #RRGGBB colour for the builder", () => {
    const needsColour = ingredientSeeds.filter(
      (i) =>
        ["base", "syrup", "topping", "shot"].includes(i.kind) ||
        (i.kind === "milk" && i.slug !== "none"),
    );
    for (const item of needsColour) {
      expect(item.color, item.slug).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("marks exactly the espresso-based bases as taking shots", () => {
    const withShots = ingredientSeeds
      .filter((i) => i.includedShots !== undefined)
      .map((i) => i.slug);
    expect(withShots).toEqual([
      "espresso",
      "americano",
      "latte",
      "cappuccino",
      "flat-white",
      "mocha",
      "spanish-latte",
    ]);
  });

  it("gives every signature drink a valid recipe and no other product one", () => {
    for (const product of productSeeds) {
      if (product.type === "signature") {
        expect(drinkConfigSchema.safeParse(product.recipe).success).toBe(true);
      } else {
        expect(product.recipe).toBeUndefined();
      }
    }
  });

  it("prices each unchanged signature at exactly its menu price", () => {
    for (const s of signatures) {
      expect(
        calculateDrinkPrice({ ...s.recipe!, signature: s.slug }, pricingCatalog)
          .unitPriceCentavos,
      ).toBe(s.priceCentavos);
    }
  });

  it("builds each recipe from scratch at the plan price, except the two known differences", () => {
    const fromScratch = Object.fromEntries(
      signatures.map((s) => [
        s.slug,
        calculateDrinkPrice(s.recipe!, pricingCatalog).unitPriceCentavos -
          s.priceCentavos,
      ]),
    );
    // Olympus Latte and Ambrosia Matcha are ₱5 cheaper on the menu than the
    // sum of their parts (owner decision, Stage 3).
    expect(fromScratch).toEqual({
      "olympus-latte": 500,
      "winged-mocha": 0,
      "caduceus-cold-brew": 0,
      "ambrosia-matcha": 500,
      "golden-sandal": 0,
      "messenger-americano": 0,
    });
  });

  it("gives seasonal items a date window", () => {
    for (const product of productSeeds.filter((p) => p.isSeasonal)) {
      expect(product.availableFrom!.getTime()).toBeLessThan(
        product.availableTo!.getTime(),
      );
    }
  });

  it("only flags real branches and products as sold out", () => {
    const branchSlugs = siteConfig.branches.map((b) => b.slug) as string[];
    const productSlugs = productSeeds.map((p) => p.slug);
    for (const s of stockSeeds) {
      expect(branchSlugs).toContain(s.branchSlug);
      expect(productSlugs).toContain(s.productSlug);
    }
  });
});
