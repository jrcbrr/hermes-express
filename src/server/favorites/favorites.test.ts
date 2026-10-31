import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedSnapshot } from "@/test/catalog-fixture";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return { ...mockDb(), requireUser: vi.fn(), snapshot: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/catalog/queries", () => ({
  getCatalogSnapshot: mocks.snapshot,
}));

const { removeFavorite, saveFavorite } = await import("./actions");
const { listFavorites } = await import("./queries");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const config = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  milk: "oat",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.snapshot.mockResolvedValue(seedSnapshot());
  mocks.state.selects = [[{ value: 0 }]];
});

describe("saveFavorite", () => {
  it("requires login", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(saveFavorite({ name: "A", config })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.state.inserted).toEqual([]);
  });

  it("saves for the signed-in user, with no price", async () => {
    expect(await saveFavorite({ name: "Monday Fuel", config })).toEqual({
      ok: true,
    });
    const row = mocks.state.inserted[0]!;
    expect(row).toMatchObject({ userId: "u1", name: "Monday Fuel", config });
    expect(JSON.stringify(row)).not.toMatch(/price/i);
  });

  it("ignores a user id sent by the browser", async () => {
    await saveFavorite({ name: "A", config, userId: "someone-else" });
    expect(mocks.state.inserted[0]?.userId).toBe("u1");
  });

  it("names an unnamed drink after its base", async () => {
    await saveFavorite({ name: "", config });
    expect(mocks.state.inserted[0]?.name).toBe("Custom Latte");
  });

  it("uses the drink's own name when there is one", async () => {
    await saveFavorite({ name: "", config: { ...config, name: "Own" } });
    expect(mocks.state.inserted[0]?.name).toBe("Own");
  });

  it("rejects a malformed drink", async () => {
    const result = await saveFavorite({ name: "A", config: { size: "9oz" } });
    expect(result.ok).toBe(false);
    expect(mocks.state.inserted).toEqual([]);
  });

  it("rejects a drink the catalog can't make", async () => {
    const result = await saveFavorite({
      name: "A",
      config: { ...config, base: "moon-dust" },
    });
    expect(result.ok).toBe(false);
  });

  it("stops at the limit", async () => {
    mocks.state.selects = [[{ value: 50 }]];
    const result = await saveFavorite({ name: "A", config });
    expect(result.ok).toBe(false);
    expect(mocks.state.inserted).toEqual([]);
  });
});

describe("removeFavorite", () => {
  it("requires login", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(removeFavorite(ID)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("removes a favorite", async () => {
    expect(await removeFavorite(ID)).toEqual({ ok: true });
  });

  it("treats another customer's as missing", async () => {
    mocks.state.deleteRows = [];
    expect((await removeFavorite(ID)).ok).toBe(false);
  });

  it("rejects a bad id", async () => {
    expect((await removeFavorite("x")).ok).toBe(false);
  });
});

describe("listFavorites", () => {
  it("returns the rows", async () => {
    mocks.state.selects = [[{ id: "f1" }]];
    expect(await listFavorites("u1")).toEqual([{ id: "f1" }]);
  });
});
