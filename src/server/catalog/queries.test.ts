import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const results = {
    ingredients: [] as unknown[],
    products: [] as unknown[],
    soldOut: [] as unknown[],
  };
  // select() is called three times, in this order, by getCatalogSnapshot().
  const order = ["ingredients", "products", "soldOut"] as const;
  let call = 0;
  const db = {
    select: vi.fn(() => {
      const key = order[call++ % order.length]!;
      const rows = () => Promise.resolve(results[key]);
      const chain = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        orderBy: vi.fn(rows),
        where: vi.fn(rows),
      };
      return chain;
    }),
  };
  return {
    db,
    results,
    resetCalls: () => {
      call = 0;
    },
    getDb: vi.fn(() => db),
    cookieValue: undefined as string | undefined,
    cacheTag: vi.fn(),
    cacheLife: vi.fn(),
  };
});

vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({
  cacheTag: mocks.cacheTag,
  cacheLife: mocks.cacheLife,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "hx_branch" && mocks.cookieValue !== undefined
        ? { name, value: mocks.cookieValue }
        : undefined,
  }),
}));

const {
  CATALOG_CACHE_TAG,
  getCatalogSnapshot,
  getSelectedBranchSlug,
  loadCatalog,
} = await import("./queries");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetCalls();
  mocks.getDb.mockImplementation(() => mocks.db);
  mocks.results.ingredients = [{ id: "i1", slug: "latte" }];
  mocks.results.products = [{ id: "p1", slug: "olympus-latte" }];
  mocks.results.soldOut = [
    { branchSlug: "bgc", ingredientId: null, productId: "p1" },
  ];
  mocks.cookieValue = undefined;
});

describe("getCatalogSnapshot", () => {
  it("loads ingredients, products and sold-out flags in one snapshot", async () => {
    await expect(getCatalogSnapshot()).resolves.toEqual({
      ingredients: [{ id: "i1", slug: "latte" }],
      products: [{ id: "p1", slug: "olympus-latte" }],
      soldOut: [{ branchSlug: "bgc", ingredientId: null, productId: "p1" }],
    });
    expect(mocks.db.select).toHaveBeenCalledTimes(3);
  });

  it("is cached under the catalog tag", async () => {
    await getCatalogSnapshot();
    expect(mocks.cacheTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG);
    expect(mocks.cacheLife).toHaveBeenCalledWith("hours");
  });
});

describe("loadCatalog", () => {
  it("returns the snapshot", async () => {
    const catalog = await loadCatalog();
    expect(catalog?.products).toEqual([{ id: "p1", slug: "olympus-latte" }]);
  });

  it("returns null and logs when the database is unavailable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not set.");
    });
    await expect(loadCatalog()).resolves.toBeNull();
    expect(error).toHaveBeenCalledWith(
      "Could not load the catalog:",
      expect.any(Error),
    );
    error.mockRestore();
  });
});

describe("getSelectedBranchSlug", () => {
  it("reads the branch from the cookie", async () => {
    mocks.cookieValue = "taguig-lakeshore";
    await expect(getSelectedBranchSlug()).resolves.toBe("taguig-lakeshore");
  });

  it("falls back to the first branch without a cookie", async () => {
    await expect(getSelectedBranchSlug()).resolves.toBe("tipas");
  });

  it("ignores a tampered cookie", async () => {
    mocks.cookieValue = "<script>";
    await expect(getSelectedBranchSlug()).resolves.toBe("tipas");
  });
});
