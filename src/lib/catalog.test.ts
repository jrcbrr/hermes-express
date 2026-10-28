import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import {
  buildMenu,
  isAvailableNow,
  recipeSlugs,
  resolveBranchSlug,
  toPricingCatalog,
  type CatalogIngredient,
  type CatalogProduct,
  type CatalogSnapshot,
} from "./catalog";
import type { DrinkConfig } from "./validation/drink";

const NOW = new Date("2026-11-15T10:00:00+08:00");

const latteRecipe: DrinkConfig = {
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

function ingredient(
  id: string,
  slug: string,
  extra: Partial<CatalogIngredient> = {},
): CatalogIngredient {
  return {
    id,
    kind: "base",
    slug,
    name: slug,
    priceCentavos: 0,
    color: null,
    includedShots: null,
    sortOrder: 0,
    isActive: true,
    ...extra,
  };
}

function product(
  id: string,
  extra: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id,
    type: "pastry",
    slug: id,
    name: id,
    description: `About ${id}`,
    priceCentavos: 10000,
    imageUrl: null,
    recipe: null,
    isSeasonal: false,
    availableFrom: null,
    availableTo: null,
    sortOrder: 0,
    isActive: true,
    ...extra,
  };
}

const snapshot: CatalogSnapshot = {
  ingredients: [
    ingredient("i-latte", "latte", { includedShots: 1, priceCentavos: 13000 }),
    ingredient("i-oat", "oat", { kind: "milk", priceCentavos: 3000 }),
    ingredient("i-honey", "honey", { kind: "syrup", priceCentavos: 2000 }),
    ingredient("i-cinnamon", "cinnamon-dust", { kind: "topping" }),
    ingredient("i-12", "12oz", { kind: "size" }),
    ingredient("i-hot", "hot", { kind: "temperature" }),
  ],
  products: [
    product("croissant", { sortOrder: 20 }),
    product("muffin", { sortOrder: 10 }),
    product("cookie", { type: "snack" }),
    product("olympus-latte", {
      type: "signature",
      priceCentavos: 17500,
      recipe: latteRecipe,
    }),
    product("pandesal", {
      isSeasonal: true,
      availableFrom: new Date("2026-10-01T00:00:00+08:00"),
      availableTo: new Date("2026-12-31T23:59:59+08:00"),
    }),
    product("summer-special", {
      isSeasonal: true,
      availableFrom: new Date("2026-04-01T00:00:00+08:00"),
      availableTo: new Date("2026-05-31T23:59:59+08:00"),
    }),
    product("retired", { isActive: false }),
  ],
  soldOut: [{ branchSlug: "bgc", ingredientId: null, productId: "croissant" }],
};

describe("resolveBranchSlug", () => {
  it("keeps a known branch", () => {
    expect(resolveBranchSlug("bgc")).toBe("bgc");
  });

  it.each([undefined, "", "makati", "BGC"])(
    "falls back to the first branch for %j",
    (value) => {
      expect(resolveBranchSlug(value)).toBe(siteConfig.branches[0].slug);
    },
  );
});

describe("isAvailableNow", () => {
  const always = { isActive: true, availableFrom: null, availableTo: null };

  it("shows active items with no date window", () => {
    expect(isAvailableNow(always, NOW)).toBe(true);
  });

  it("hides inactive items", () => {
    expect(isAvailableNow({ ...always, isActive: false }, NOW)).toBe(false);
  });

  it("respects the start date", () => {
    expect(isAvailableNow({ ...always, availableFrom: NOW }, NOW)).toBe(true);
    expect(
      isAvailableNow(
        { ...always, availableFrom: new Date(NOW.getTime() + 1) },
        NOW,
      ),
    ).toBe(false);
  });

  it("respects the end date", () => {
    expect(isAvailableNow({ ...always, availableTo: NOW }, NOW)).toBe(true);
    expect(
      isAvailableNow(
        { ...always, availableTo: new Date(NOW.getTime() - 1) },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("recipeSlugs", () => {
  it("lists every ingredient in a drink", () => {
    expect(recipeSlugs(latteRecipe)).toEqual([
      "12oz",
      "hot",
      "latte",
      "oat",
      "honey",
      "cinnamon-dust",
    ]);
  });
});

describe("buildMenu", () => {
  const names = (menu: ReturnType<typeof buildMenu>, type: string) =>
    menu.find((s) => s.type === type)?.items.map((i) => i.slug);

  it("groups products into signature, pastry and snack sections, in order", () => {
    const menu = buildMenu(snapshot, "tipas", NOW);
    expect(menu.map((s) => s.type)).toEqual(["signature", "pastry", "snack"]);
    expect(names(menu, "signature")).toEqual(["olympus-latte"]);
    expect(names(menu, "pastry")).toEqual(["pandesal", "muffin", "croissant"]);
    expect(names(menu, "snack")).toEqual(["cookie"]);
  });

  it("hides inactive and out-of-season products", () => {
    const slugs = buildMenu(snapshot, "tipas", NOW).flatMap((s) =>
      s.items.map((i) => i.slug),
    );
    expect(slugs).not.toContain("retired");
    expect(slugs).not.toContain("summer-special");
  });

  it("marks seasonal products that are in season", () => {
    const pastries = buildMenu(snapshot, "tipas", NOW)[1]!.items;
    expect(pastries.find((i) => i.slug === "pandesal")?.isSeasonal).toBe(true);
    expect(pastries.find((i) => i.slug === "muffin")?.isSeasonal).toBe(false);
  });

  it("marks products sold out only at the flagged branch", () => {
    const soldOutAt = (branch: string) =>
      buildMenu(snapshot, branch, NOW)[1]!.items.find(
        (i) => i.slug === "croissant",
      )?.isSoldOut;
    expect(soldOutAt("bgc")).toBe(true);
    expect(soldOutAt("tipas")).toBe(false);
  });

  it("marks a signature sold out when a recipe ingredient is sold out there", () => {
    const withOatOut: CatalogSnapshot = {
      ...snapshot,
      soldOut: [{ branchSlug: "bgc", ingredientId: "i-oat", productId: null }],
    };
    const signatureAt = (branch: string) =>
      buildMenu(withOatOut, branch, NOW)[0]!.items[0]!.isSoldOut;
    expect(signatureAt("bgc")).toBe(true);
    expect(signatureAt("tipas")).toBe(false);
  });

  it("marks a signature sold out everywhere when a recipe ingredient is switched off", () => {
    const withHoneyOff: CatalogSnapshot = {
      ...snapshot,
      ingredients: snapshot.ingredients.map((i) =>
        i.slug === "honey" ? { ...i, isActive: false } : i,
      ),
    };
    expect(buildMenu(withHoneyOff, "tipas", NOW)[0]!.items[0]!.isSoldOut).toBe(
      true,
    );
  });

  it("returns empty sections when there are no products", () => {
    const menu = buildMenu({ ...snapshot, products: [] }, "tipas", NOW);
    expect(menu.every((s) => s.items.length === 0)).toBe(true);
  });

  it("passes through the card details", () => {
    expect(buildMenu(snapshot, "tipas", NOW)[0]!.items[0]).toEqual({
      type: "signature",
      slug: "olympus-latte",
      name: "olympus-latte",
      description: "About olympus-latte",
      priceCentavos: 17500,
      isSeasonal: false,
      isSoldOut: false,
    });
  });
});

describe("toPricingCatalog", () => {
  it("keeps the pricing fields of every ingredient", () => {
    const catalog = toPricingCatalog(snapshot);
    expect(catalog.ingredients).toHaveLength(snapshot.ingredients.length);
    expect(catalog.ingredients[0]).toEqual({
      slug: "latte",
      name: "latte",
      kind: "base",
      priceCentavos: 13000,
      includedShots: 1,
      isActive: true,
    });
  });

  it("includes only signature drinks that have a recipe", () => {
    const catalog = toPricingCatalog({
      ...snapshot,
      products: [
        ...snapshot.products,
        product("broken-signature", { type: "signature", recipe: null }),
      ],
    });
    expect(catalog.signatures).toEqual([
      {
        slug: "olympus-latte",
        name: "olympus-latte",
        priceCentavos: 17500,
        recipe: latteRecipe,
        isActive: true,
      },
    ]);
  });
});
