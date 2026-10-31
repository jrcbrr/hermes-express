import { beforeEach, describe, expect, it, vi } from "vitest";
import { form } from "@/test/db-mock";
import { seedSnapshot } from "@/test/catalog-fixture";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return {
    ...mockDb(),
    role: { current: "admin" as string | null },
    updateTag: vi.fn(),
    revalidatePath: vi.fn(),
    snapshot: vi.fn(),
  };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/server/catalog/queries", () => ({
  CATALOG_CACHE_TAG: "catalog",
  getCatalogSnapshot: mocks.snapshot,
}));
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!mocks.role.current || !roles.includes(mocks.role.current)) {
      throw new Error("NEXT_REDIRECT");
    }
    return { id: "admin-1", role: mocks.role.current };
  }),
}));

const { createProduct, setProductActive, updateProduct } =
  await import("./menu-actions");

const snapshot = seedSnapshot();
const matcha = snapshot.products.find((p) => p.slug === "ambrosia-matcha")!;
const messenger = snapshot.products.find(
  (p) => p.slug === "messenger-americano",
)!;
const recipe = matcha.recipe!;

const pastry = {
  name: "Banana Bread",
  description: "Warm",
  price: "85",
  isActive: "on",
};
const recipeFields = {
  recipeSize: recipe.size,
  recipeTemperature: recipe.temperature,
  recipeBase: recipe.base,
  recipeMilk: recipe.milk,
  recipeSweetness: String(recipe.sweetness),
  recipeSyrups: recipe.syrups,
  recipeToppings: recipe.toppings,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.role.current = "admin";
  mocks.snapshot.mockResolvedValue(snapshot);
});

describe.each(["customer", "barista", null])("as %s", (role) => {
  beforeEach(() => {
    mocks.role.current = role;
  });

  it("can't create, update or hide", async () => {
    await expect(
      createProduct({}, form({ ...pastry, type: "pastry" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    await expect(
      updateProduct({}, form({ ...pastry, id: "p1" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    await expect(setProductActive({ id: "p1", active: false })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.state.sets).toEqual([]);
    expect(mocks.state.inserted).toEqual([]);
  });
});

describe("createProduct", () => {
  it("creates a pastry and clears the catalog cache", async () => {
    mocks.state.selects = [[{ slug: "banana-bread" }]];
    await expect(
      createProduct({}, form({ ...pastry, type: "pastry" })),
    ).rejects.toThrow("REDIRECT:/admin/menu");
    expect(mocks.state.inserted[0]).toMatchObject({
      type: "pastry",
      slug: "banana-bread-2",
      priceCentavos: 8500,
      recipe: null,
      isSeasonal: false,
      availableFrom: null,
      availableTo: null,
      isActive: true,
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
  });

  it("stores seasonal dates as whole Manila days", async () => {
    await expect(
      createProduct(
        {},
        form({
          ...pastry,
          type: "pastry",
          isSeasonal: "on",
          availableFrom: "2026-12-01",
          availableTo: "2026-12-31",
        }),
      ),
    ).rejects.toThrow("REDIRECT");
    const row = mocks.state.inserted[0]!;
    expect((row.availableFrom as Date).toISOString()).toBe(
      "2026-11-30T16:00:00.000Z",
    );
    expect((row.availableTo as Date).toISOString()).toBe(
      "2026-12-31T15:59:59.999Z",
    );
  });

  it("returns errors and what was typed", async () => {
    const state = await createProduct(
      {},
      form({ ...pastry, type: "pastry", price: "abc" }),
    );
    expect(state.errors?.price).toBeDefined();
    expect(state.values?.name).toBe("Banana Bread");
    expect(mocks.state.inserted).toEqual([]);
  });

  it("rejects an unknown type", async () => {
    const state = await createProduct({}, form({ ...pastry, type: "soup" }));
    expect(state.errors?.type).toBeDefined();
  });

  it("creates a signature with its recipe", async () => {
    await expect(
      createProduct(
        {},
        form({ ...pastry, ...recipeFields, type: "signature" }),
      ),
    ).rejects.toThrow("REDIRECT");
    expect(mocks.state.inserted[0]?.recipe).toMatchObject({
      base: recipe.base,
      milkAmount: "regular",
    });
  });

  it("gives an iced signature an ice level", async () => {
    await expect(
      createProduct(
        {},
        form({
          ...pastry,
          ...recipeFields,
          type: "signature",
          recipeTemperature: "iced",
        }),
      ),
    ).rejects.toThrow("REDIRECT");
    expect(mocks.state.inserted[0]?.recipe).toMatchObject({
      iceLevel: "regular",
    });
  });

  it("refuses a signature with no recipe", async () => {
    const state = await createProduct(
      {},
      form({ ...pastry, type: "signature" }),
    );
    expect(state.errors?.recipe).toBeDefined();
    expect(mocks.state.inserted).toEqual([]);
  });

  it("refuses a recipe with an unknown ingredient", async () => {
    const state = await createProduct(
      {},
      form({
        ...pastry,
        ...recipeFields,
        type: "signature",
        recipeBase: "moon-dust",
      }),
    );
    expect(state.errors?.recipe).toBeDefined();
  });

  it("refuses a new recipe using an option that is off", async () => {
    mocks.snapshot.mockResolvedValue({
      ...snapshot,
      ingredients: snapshot.ingredients.map((i) =>
        i.slug === recipe.base ? { ...i, isActive: false } : i,
      ),
    });
    const state = await createProduct(
      {},
      form({ ...pastry, ...recipeFields, type: "signature" }),
    );
    expect(state.errors?.recipe).toBeDefined();
  });

  it("asks to retry when the slug was taken at that moment", async () => {
    mocks.state.insertRows = [];
    const state = await createProduct({}, form({ ...pastry, type: "pastry" }));
    expect(state.errors?.form).toBeDefined();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("rethrows errors that aren't about pricing", async () => {
    mocks.snapshot.mockResolvedValue({
      ...snapshot,
      get ingredients(): never {
        throw new Error("boom");
      },
    });
    await expect(
      createProduct(
        {},
        form({ ...pastry, ...recipeFields, type: "signature" }),
      ),
    ).rejects.toThrow("boom");
  });
});

describe("updateProduct", () => {
  it("saves a new price and clears the catalog cache", async () => {
    mocks.state.selects = [[{ type: "pastry", recipe: null }]];
    const state = await updateProduct(
      {},
      form({ ...pastry, id: "p1", price: "99.50" }),
    );
    expect(state).toEqual({ status: "saved" });
    expect(mocks.state.sets[0]).toMatchObject({ priceCentavos: 9950 });
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
  });

  it("never writes the slug or type", async () => {
    mocks.state.selects = [[{ type: "pastry", recipe: null }]];
    await updateProduct(
      {},
      form({ ...pastry, id: "p1", slug: "x", type: "snack" }),
    );
    expect(mocks.state.sets[0]).not.toHaveProperty("slug");
    expect(mocks.state.sets[0]).not.toHaveProperty("type");
  });

  it("clears the dates when an item stops being seasonal", async () => {
    mocks.state.selects = [[{ type: "pastry", recipe: null }]];
    await updateProduct(
      {},
      form({
        ...pastry,
        id: "p1",
        availableFrom: "2026-12-01",
        availableTo: "2026-12-31",
      }),
    );
    expect(mocks.state.sets[0]).toMatchObject({
      isSeasonal: false,
      availableFrom: null,
      availableTo: null,
    });
  });

  it("returns validation errors", async () => {
    const state = await updateProduct({}, form({ ...pastry, name: "" }));
    expect(state.errors?.name).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("reports a missing product", async () => {
    mocks.state.selects = [[]];
    const state = await updateProduct({}, form({ ...pastry, id: "nope" }));
    expect(state.errors?.form).toBeDefined();
  });

  it("lets a signature's price change while its ingredient is off", async () => {
    mocks.state.selects = [[{ type: "signature", recipe }]];
    mocks.snapshot.mockResolvedValue({
      ...snapshot,
      ingredients: snapshot.ingredients.map((i) =>
        i.slug === recipe.base ? { ...i, isActive: false } : i,
      ),
    });
    const state = await updateProduct(
      {},
      form({ ...pastry, ...recipeFields, id: matcha.id, price: "200" }),
    );
    expect(state).toEqual({ status: "saved" });
  });

  it("keeps a saved recipe's extra shots", async () => {
    const saved = messenger.recipe!;
    mocks.state.selects = [[{ type: "signature", recipe: saved }]];
    await updateProduct(
      {},
      form({
        ...pastry,
        id: messenger.id,
        recipeSize: saved.size,
        recipeTemperature: saved.temperature,
        recipeBase: saved.base,
        recipeMilk: saved.milk,
        recipeSweetness: String(saved.sweetness),
        recipeSyrups: saved.syrups,
        recipeToppings: saved.toppings,
      }),
    );
    expect(mocks.state.sets[0]?.recipe).toMatchObject({ shots: saved.shots });
  });

  it("refuses an invalid recipe change", async () => {
    mocks.state.selects = [[{ type: "signature", recipe }]];
    const state = await updateProduct(
      {},
      form({ ...pastry, ...recipeFields, id: matcha.id, recipeBase: "nope" }),
    );
    expect(state.errors?.recipe).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });
});

describe("setProductActive", () => {
  it("hides a product", async () => {
    expect(await setProductActive({ id: "p1", active: false })).toEqual({
      ok: true,
    });
    expect(mocks.state.sets[0]).toEqual({ isActive: false });
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
  });

  it("rejects bad input", async () => {
    const result = await setProductActive({ id: "", active: "no" });
    expect(result.ok).toBe(false);
    expect(mocks.state.sets).toEqual([]);
  });

  it("reports a missing product", async () => {
    mocks.state.updateRows = [];
    const result = await setProductActive({ id: "p1", active: true });
    expect(result.ok).toBe(false);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
