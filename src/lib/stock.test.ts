import { describe, expect, it } from "vitest";
import { ingredientSoldOut, seedSnapshot } from "@/test/catalog-fixture";
import { buildStockList } from "./stock";

describe("buildStockList", () => {
  it("lists stock kinds only, leaving out sizes, temperatures and shots", () => {
    const { ingredients } = buildStockList(seedSnapshot(), "bgc");
    expect(ingredients.map((g) => g.kind)).toEqual([
      "base",
      "milk",
      "syrup",
      "topping",
    ]);
    const names = ingredients.flatMap((g) => g.items.map((i) => i.name));
    expect(names).toContain("Latte");
    expect(names).not.toContain("16oz");
  });

  it("marks an ingredient sold out only at its own branch", () => {
    const snapshot = seedSnapshot([ingredientSoldOut("bgc", "oat")]);
    const oat = (branch: string) =>
      buildStockList(snapshot, branch)
        .ingredients.flatMap((g) => g.items)
        .find((i) => i.id === "i-oat")!;
    expect(oat("bgc").isSoldOut).toBe(true);
    expect(oat("tipas").isSoldOut).toBe(false);
  });

  it("says which ingredient blocks a signature drink", () => {
    const snapshot = seedSnapshot([ingredientSoldOut("bgc", "oat")]);
    const olympus = buildStockList(snapshot, "bgc").products.find(
      (p) => p.name === "Olympus Latte",
    )!;
    expect(olympus.isSoldOut).toBe(false);
    expect(olympus.blockedBy).toEqual(["Oat milk"]);
  });

  it("marks a product flagged directly, and hides inactive items", () => {
    const snapshot = seedSnapshot([
      { branchSlug: "bgc", ingredientId: null, productId: "p-banana-bread" },
    ]);
    snapshot.products = snapshot.products.map((p) =>
      p.slug === "ensaymada" ? { ...p, isActive: false } : p,
    );
    snapshot.ingredients = snapshot.ingredients.map((i) =>
      i.slug === "vanilla" ? { ...i, isActive: false } : i,
    );
    const stock = buildStockList(snapshot, "bgc");
    expect(stock.products.find((p) => p.id === "p-banana-bread")).toMatchObject(
      { isSoldOut: true, blockedBy: [] },
    );
    expect(stock.products.some((p) => p.id === "p-ensaymada")).toBe(false);
    expect(
      stock.ingredients
        .flatMap((g) => g.items)
        .some((i) => i.id === "i-vanilla"),
    ).toBe(false);
  });
});
