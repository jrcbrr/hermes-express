import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/cart";

const mocks = vi.hoisted(() => {
  const state = { saved: [] as unknown[] };
  const db = {
    select: vi.fn(() => db),
    from: vi.fn(() => db),
    where: vi.fn(async () =>
      state.saved.length > 0 ? [{ items: state.saved }] : [],
    ),
    insert: vi.fn(() => db),
    values: vi.fn(() => db),
    onConflictDoUpdate: vi.fn(async () => undefined),
  };
  return { db, state, getSession: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));

const { saveCart, syncCart } = await import("./actions");

const croissant: CartItem = {
  id: "a",
  kind: "product",
  productSlug: "butter-croissant",
  quantity: 1,
};
const ensaymada: CartItem = {
  id: "b",
  kind: "product",
  productSlug: "ensaymada",
  quantity: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.saved = [];
  mocks.getSession.mockResolvedValue({ user: { id: "u1" } });
});

describe("syncCart", () => {
  it("answers signed-out callers with nothing, without touching the database", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(await syncCart([croissant])).toEqual({ userId: null, items: [] });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("loads the saved cart when there is nothing to merge", async () => {
    mocks.state.saved = [croissant, { broken: true }];
    expect(await syncCart([])).toEqual({ userId: "u1", items: [croissant] });
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("merges a guest cart into the account and saves it", async () => {
    mocks.state.saved = [croissant];
    const result = await syncCart([
      { ...croissant, id: "g", quantity: 2, unitPriceCentavos: 1 },
      ensaymada,
      "junk",
    ]);
    const expected = [{ ...croissant, quantity: 3 }, ensaymada];
    expect(result).toEqual({ userId: "u1", items: expected });
    expect(mocks.db.values).toHaveBeenCalledWith({
      userId: "u1",
      items: expected,
    });
    expect(mocks.db.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ items: expected }),
      }),
    );
  });

  it("starts from an empty saved cart for a new account", async () => {
    expect(await syncCart([ensaymada])).toEqual({
      userId: "u1",
      items: [ensaymada],
    });
  });
});

describe("saveCart", () => {
  it("saves a valid cart to the signed-in user's own row", async () => {
    await saveCart([croissant]);
    expect(mocks.db.values).toHaveBeenCalledWith({
      userId: "u1",
      items: [croissant],
    });
  });

  it("ignores signed-out callers and invalid carts", async () => {
    await saveCart([{ ...croissant, quantity: 0 }]);
    mocks.getSession.mockResolvedValue(null);
    await saveCart([croissant]);
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });
});
