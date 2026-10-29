import { describe, expect, it } from "vitest";
import {
  FIXTURE_NOW,
  ingredientSoldOut,
  seedSnapshot,
} from "@/test/catalog-fixture";
import {
  addToCart,
  cartCount,
  drinkDetails,
  EMPTY_CART,
  findCartItem,
  MAX_CART_LINES,
  mergeCarts,
  priceCartItems,
  readStoredCart,
  removeFromCart,
  replaceCartItem,
  sameCartContent,
  setCartQuantity,
  type CartItem,
  type CustomCartItem,
} from "./cart";
import type { DrinkConfig } from "./validation/drink";

const latte: DrinkConfig = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  milk: "whole",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
};

const croissant: CartItem = {
  id: "a",
  kind: "product",
  productSlug: "butter-croissant",
  quantity: 1,
};
const customLatte: CustomCartItem = {
  id: "b",
  kind: "custom",
  config: latte,
  quantity: 2,
};

describe("addToCart", () => {
  it("adds a new item with the given id", () => {
    const { items, ok } = addToCart(
      [],
      { kind: "product", productSlug: "butter-croissant", quantity: 1 },
      "x",
    );
    expect(ok).toBe(true);
    expect(items).toEqual([{ ...croissant, id: "x" }]);
  });

  it("raises the quantity of the same item instead of adding a line", () => {
    const { items } = addToCart(
      [croissant],
      { kind: "product", productSlug: "butter-croissant", quantity: 3 },
      "new",
    );
    expect(items).toEqual([{ ...croissant, quantity: 4 }]);
  });

  it("treats the same drink with syrups in another order as the same", () => {
    const withSyrups = {
      ...customLatte,
      config: { ...latte, syrups: ["vanilla", "caramel"] },
    };
    const { items } = addToCart(
      [withSyrups],
      {
        kind: "custom",
        config: { ...latte, syrups: ["caramel", "vanilla"] },
        quantity: 1,
      },
      "new",
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(3);
  });

  it("caps quantities at 20 and keeps them whole", () => {
    const { items } = addToCart(
      [{ ...croissant, quantity: 19 }],
      { kind: "product", productSlug: "butter-croissant", quantity: 5 },
      "new",
    );
    expect(items[0]!.quantity).toBe(20);
    expect(
      addToCart([], { kind: "product", productSlug: "x", quantity: 2.6 }, "n")
        .items[0]!.quantity,
    ).toBe(3);
    expect(
      addToCart([], { kind: "product", productSlug: "x", quantity: NaN }, "n")
        .items[0]!.quantity,
    ).toBe(1);
  });

  it("refuses a new line when the cart is full", () => {
    const full: CartItem[] = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      id: `i${i}`,
      kind: "product",
      productSlug: `item-${i}`,
      quantity: 1,
    }));
    const result = addToCart(
      full,
      { kind: "product", productSlug: "another", quantity: 1 },
      "n",
    );
    expect(result.ok).toBe(false);
    expect(result.items).toHaveLength(MAX_CART_LINES);
  });
});

describe("changing the cart", () => {
  const cart = [croissant, customLatte];

  it("sets a quantity within 1–20", () => {
    expect(setCartQuantity(cart, "b", 5)[1]!.quantity).toBe(5);
    expect(setCartQuantity(cart, "b", 0)[1]!.quantity).toBe(1);
    expect(setCartQuantity(cart, "b", 99)[1]!.quantity).toBe(20);
    expect(setCartQuantity(cart, "b", 5)[0]).toBe(croissant);
  });

  it("removes an item", () => {
    expect(removeFromCart(cart, "a")).toEqual([customLatte]);
  });

  it("replaces an edited drink in place, keeping its id", () => {
    const iced = {
      ...latte,
      temperature: "iced" as const,
      iceLevel: "regular" as const,
    };
    const next = replaceCartItem(cart, "b", {
      kind: "custom",
      config: iced,
      quantity: 1,
    });
    expect(next[1]).toEqual({
      id: "b",
      kind: "custom",
      config: iced,
      quantity: 1,
    });
    expect(next[0]).toBe(croissant);
  });

  it("finds items and counts cups", () => {
    expect(findCartItem(cart, "b")).toBe(customLatte);
    expect(findCartItem(cart, "zzz")).toBeUndefined();
    expect(cartCount(cart)).toBe(3);
    expect(cartCount([])).toBe(0);
  });

  it("never treats a product and a custom drink as the same", () => {
    expect(sameCartContent(croissant, customLatte)).toBe(false);
  });
});

describe("mergeCarts", () => {
  it("adds the guest's items to the account's", () => {
    expect(mergeCarts([croissant], [customLatte])).toEqual([
      croissant,
      customLatte,
    ]);
  });

  it("combines the same item, and skips items it already has by id", () => {
    const guestCroissant = { ...croissant, id: "g", quantity: 2 };
    expect(mergeCarts([croissant], [guestCroissant, croissant])).toEqual([
      { ...croissant, quantity: 3 },
    ]);
  });

  it("is safe to repeat", () => {
    const once = mergeCarts([croissant], [customLatte]);
    expect(mergeCarts(once, once)).toEqual(once);
  });

  it("stops at the cart limit", () => {
    const full: CartItem[] = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      id: `i${i}`,
      kind: "product",
      productSlug: `item-${i}`,
      quantity: 1,
    }));
    expect(mergeCarts(full, [customLatte])).toHaveLength(MAX_CART_LINES);
  });
});

describe("readStoredCart", () => {
  it("reads a saved cart", () => {
    expect(readStoredCart({ owner: "u1", items: [croissant] })).toEqual({
      owner: "u1",
      items: [croissant],
    });
  });

  it("returns an empty cart for anything else", () => {
    expect(readStoredCart(null)).toEqual(EMPTY_CART);
    expect(readStoredCart([croissant])).toEqual(EMPTY_CART);
    expect(readStoredCart({ items: "nope" })).toEqual(EMPTY_CART);
  });

  it("drops broken items and fixes quantities", () => {
    const cart = readStoredCart({
      owner: 7,
      items: [
        { ...croissant, quantity: 50 },
        { id: "", kind: "product", productSlug: "x", quantity: 1 },
        { id: "c", kind: "product", quantity: 1 },
        { id: "d", kind: "custom", config: null, quantity: 1 },
        { id: "e", kind: "gift", quantity: 1 },
        { id: "f", kind: "product", productSlug: "x", quantity: "1" },
        "junk",
        customLatte,
      ],
    });
    expect(cart).toEqual({
      owner: null,
      items: [{ ...croissant, quantity: 20 }, customLatte],
    });
  });
});

describe("drinkDetails", () => {
  const names = new Map([
    ["hot", "Hot"],
    ["iced", "Iced"],
    ["latte", "Latte"],
    ["oat", "Oat Milk"],
    ["vanilla", "Vanilla"],
    ["cold-foam", "Cold Foam"],
  ]);

  it("lists the choices in builder order", () => {
    expect(
      drinkDetails(
        {
          ...latte,
          size: "16oz",
          temperature: "iced",
          iceLevel: "light",
          shots: 2,
          milk: "oat",
          milkAmount: "extra",
          syrups: ["vanilla"],
          toppings: ["cold-foam"],
        },
        names,
      ),
    ).toEqual([
      "16oz",
      "Iced",
      "Light ice",
      "Latte",
      "2 shots",
      "Oat Milk (extra)",
      "50% sweet",
      "Vanilla",
      "Cold Foam",
    ]);
  });

  it("keeps it short for regular choices and no milk", () => {
    expect(
      drinkDetails(
        {
          ...latte,
          temperature: "iced",
          iceLevel: "regular",
          shots: 1,
          milk: "none",
        },
        names,
      ),
    ).toEqual(["12oz", "Iced", "Latte", "1 shot", "No milk", "50% sweet"]);
    expect(drinkDetails({ ...latte, base: "mystery" }, new Map())).toContain(
      "mystery",
    );
  });
});

describe("priceCartItems", () => {
  const snapshot = seedSnapshot();
  const price = (items: CartItem[], s = snapshot, branch = "bgc") =>
    priceCartItems(items, s, branch, FIXTURE_NOW);

  it("prices products from the menu", () => {
    const [line] = price([{ ...croissant, quantity: 2 }]);
    expect(line).toMatchObject({
      name: "Butter Croissant",
      unitPriceCentavos: 9500,
      lineTotalCentavos: 19000,
      problem: null,
    });
  });

  it("prices custom drinks with the same function as the builder", () => {
    const [line] = price([customLatte]);
    expect(line).toMatchObject({
      name: "Custom Latte",
      unitPriceCentavos: 13000,
      lineTotalCentavos: 26000,
      problem: null,
    });
    expect(line!.details).toContain("Whole milk");
  });

  it("names drinks by the customer's name or their signature", () => {
    const named = price([
      { ...customLatte, config: { ...latte, name: "Monday Fuel" } },
    ]);
    expect(named[0]!.name).toBe("Monday Fuel");

    const recipe = snapshot.products.find(
      (p) => p.slug === "olympus-latte",
    )!.recipe!;
    const signature = price([
      {
        ...customLatte,
        quantity: 1,
        config: { ...recipe, signature: "olympus-latte" },
      },
    ]);
    expect(signature[0]).toMatchObject({
      name: "Olympus Latte (customized)",
      unitPriceCentavos: 17500,
      problem: null,
    });
  });

  it("flags items no longer on the menu", () => {
    const [missing] = price([{ ...croissant, productSlug: "gone" }]);
    expect(missing).toMatchObject({
      unitPriceCentavos: null,
      lineTotalCentavos: null,
    });
    expect(missing!.problem).toMatch(/no longer on the menu/);

    const inactive = {
      ...snapshot,
      products: snapshot.products.map((p) =>
        p.slug === "butter-croissant" ? { ...p, isActive: false } : p,
      ),
    };
    expect(price([croissant], inactive)[0]!.name).toBe("Butter Croissant");
    expect(price([croissant], inactive)[0]!.problem).toMatch(/no longer/);
  });

  it("flags products and ingredients sold out at the branch", () => {
    const flagged = seedSnapshot([
      {
        branchSlug: "bgc",
        ingredientId: null,
        productId: "p-butter-croissant",
      },
      ingredientSoldOut("bgc", "whole"),
    ]);
    const [product, drink] = price([croissant, customLatte], flagged);
    expect(product!.problem).toBe("Sold out at BGC.");
    expect(product!.unitPriceCentavos).toBe(9500);
    expect(drink!.problem).toBe("Whole milk is sold out at BGC.");

    const two = seedSnapshot([
      ingredientSoldOut("bgc", "whole"),
      ingredientSoldOut("bgc", "vanilla"),
    ]);
    const [withSyrup] = price(
      [{ ...customLatte, config: { ...latte, syrups: ["vanilla"] } }],
      two,
    );
    expect(withSyrup!.problem).toBe("Whole milk, Vanilla are sold out at BGC.");

    // Another branch is unaffected.
    expect(
      price([croissant, customLatte], flagged, "tipas").map((l) => l.problem),
    ).toEqual([null, null]);
  });

  it("flags a customized signature only when the drink itself is flagged", () => {
    const recipe = snapshot.products.find(
      (p) => p.slug === "olympus-latte",
    )!.recipe!;
    const item: CartItem = {
      ...customLatte,
      config: { ...recipe, milk: "whole", signature: "olympus-latte" },
    };
    // Oat milk is sold out, but this customer swapped it for whole milk.
    const oatOut = seedSnapshot([ingredientSoldOut("bgc", "oat")]);
    expect(price([item], oatOut)[0]!.problem).toBeNull();

    const drinkOut = seedSnapshot([
      { branchSlug: "bgc", ingredientId: null, productId: "p-olympus-latte" },
    ]);
    expect(price([item], drinkOut)[0]!.problem).toBe("Sold out at BGC.");
  });

  it("flags a customized signature that left the menu", () => {
    const recipe = snapshot.products.find(
      (p) => p.slug === "olympus-latte",
    )!.recipe!;
    const seasonalOver = {
      ...snapshot,
      products: snapshot.products.map((p) =>
        p.slug === "olympus-latte"
          ? { ...p, availableTo: new Date("2020-01-01T00:00:00Z") }
          : p,
      ),
    };
    const [line] = price(
      [{ ...customLatte, config: { ...recipe, signature: "olympus-latte" } }],
      seasonalOver,
    );
    expect(line!.problem).toMatch(/no longer on the menu/);
    expect(line!.unitPriceCentavos).toBeNull();
  });

  it("flags drinks that can no longer be made", () => {
    const [line] = price([
      { ...customLatte, config: { ...latte, base: "pumpkin-spice" } },
    ]);
    expect(line).toMatchObject({ unitPriceCentavos: null, details: [] });
    expect(line!.problem).toMatch(/can no longer be made/);
  });

  it("uses the slug when a branch is unknown", () => {
    const flagged = seedSnapshot([
      {
        branchSlug: "mars",
        ingredientId: null,
        productId: "p-butter-croissant",
      },
    ]);
    expect(price([croissant], flagged, "mars")[0]!.problem).toBe(
      "Sold out at mars.",
    );
  });

  it("lets unexpected errors through", () => {
    const broken = {
      ...snapshot,
      ingredients: null,
    } as unknown as typeof snapshot;
    expect(() => price([customLatte], broken)).toThrow(TypeError);
  });
});
