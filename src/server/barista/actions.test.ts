import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { branchStock } from "@/db/schema";

const mocks = vi.hoisted(() => {
  const state = {
    selects: [] as unknown[][],
    executeRows: [{ id: "event" }] as unknown[],
    inserted: [] as { table: unknown; values: unknown; conflict: unknown }[],
  };
  const db = {
    select: vi.fn(() => {
      const rows = state.selects.shift() ?? [];
      return { from: () => ({ where: async () => rows }) };
    }),
    execute: vi.fn(async (...args: unknown[]) => {
      void args;
      return { rows: state.executeRows };
    }),
    insert: vi.fn((table: unknown) => ({
      values: (values: unknown) => ({
        onConflictDoUpdate: async (conflict: unknown) => {
          state.inserted.push({ table, values, conflict });
        },
      }),
    })),
  };
  return { db, state, requireRole: vi.fn(), updateTag: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/server/auth/session", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/catalog/queries", () => ({ CATALOG_CACHE_TAG: "catalog" }));

const { advanceOrder, setSoldOut } = await import("./actions");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const barista = { id: "barista-1", role: "barista", branchId: "b-bgc" };
const admin = { id: "admin-1", role: "admin", branchId: null };
const pickup = {
  branchId: "b-bgc",
  status: "received",
  fulfillment: "pickup",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.selects = [[pickup]];
  mocks.state.executeRows = [{ id: "event" }];
  mocks.state.inserted = [];
  mocks.requireRole.mockResolvedValue(barista);
});

describe("advanceOrder", () => {
  it("requires staff", async () => {
    await advanceOrder({ orderId: ID, to: "brewing" });
    expect(mocks.requireRole).toHaveBeenCalledWith(
      ["barista", "admin"],
      "/barista",
    );
  });

  it("stops when requireRole turns the visitor away", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(advanceOrder({ orderId: ID, to: "brewing" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it("moves the order and writes one event in a single statement", async () => {
    expect(await advanceOrder({ orderId: ID, to: "brewing" })).toEqual({
      ok: true,
    });
    expect(mocks.db.execute).toHaveBeenCalledTimes(1);
    const { sql, params } = new PgDialect().sqlToQuery(
      mocks.db.execute.mock.calls[0]![0] as SQL,
    );
    expect(sql).toContain('update "order"');
    expect(sql).toContain("insert into order_status_event");
    // Guards the race: it only matches while the status is still "received".
    expect(sql).toMatch(/where id = \$\d+ and status = \$\d+/);
    expect(params).toEqual(
      expect.arrayContaining([ID, "brewing", "received", "barista-1"]),
    );
  });

  it("treats another branch's order like a missing one, and writes nothing", async () => {
    mocks.requireRole.mockResolvedValue({ ...barista, branchId: "b-tipas" });
    const other = await advanceOrder({ orderId: ID, to: "brewing" });
    mocks.state.selects = [[]];
    mocks.requireRole.mockResolvedValue(barista);
    const missing = await advanceOrder({ orderId: ID, to: "brewing" });
    expect(other).toEqual(missing);
    expect(other).toEqual({
      ok: false,
      message: "We could not find this order.",
    });
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it("lets an admin move any branch's order", async () => {
    mocks.requireRole.mockResolvedValue(admin);
    expect((await advanceOrder({ orderId: ID, to: "brewing" })).ok).toBe(true);
  });

  it("rejects skipped steps and the wrong fulfillment's step", async () => {
    expect((await advanceOrder({ orderId: ID, to: "completed" })).ok).toBe(
      false,
    );
    mocks.state.selects = [[{ ...pickup, status: "brewing" }]];
    expect(
      (await advanceOrder({ orderId: ID, to: "out_for_delivery" })).ok,
    ).toBe(false);
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it("allows cancelling an order that has not left the bar", async () => {
    expect((await advanceOrder({ orderId: ID, to: "cancelled" })).ok).toBe(
      true,
    );
  });

  it("reports the race when another barista got there first", async () => {
    mocks.state.executeRows = [];
    expect(await advanceOrder({ orderId: ID, to: "brewing" })).toEqual({
      ok: false,
      message:
        "This order was just updated. The queue will show its latest status.",
    });
  });

  it("rejects bad input before reading anything", async () => {
    for (const input of [
      null,
      { orderId: "nope", to: "brewing" },
      { orderId: ID, to: "lost" },
    ]) {
      expect((await advanceOrder(input)).ok).toBe(false);
    }
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});

describe("advanceOrder cancelling", () => {
  it("gives the promo use back only when cancelling", async () => {
    const query = () =>
      new PgDialect().sqlToQuery(mocks.db.execute.mock.calls[0]![0] as SQL).sql;
    await advanceOrder({ orderId: ID, to: "brewing" });
    expect(query()).not.toContain("promo_code set");

    mocks.db.execute.mockClear();
    mocks.state.selects = [[pickup]];
    await advanceOrder({ orderId: ID, to: "cancelled" });
    expect(query()).toContain("update promo_code");
  });
});

describe("setSoldOut", () => {
  const input = {
    branchId: "b-bgc",
    kind: "ingredient",
    itemId: "i-oat",
    soldOut: true,
  };

  beforeEach(() => {
    mocks.state.selects = [[{ id: "i-oat" }]];
  });

  it("saves an ingredient for the branch and clears the catalog cache", async () => {
    expect(await setSoldOut(input)).toEqual({ ok: true });
    const [saved] = mocks.state.inserted;
    expect(saved!.table).toBe(branchStock);
    expect(saved!.values).toMatchObject({
      branchId: "b-bgc",
      ingredientId: "i-oat",
      productId: null,
      isSoldOut: true,
    });
    expect(saved!.conflict).toEqual({
      target: [branchStock.branchId, branchStock.ingredientId],
      set: { isSoldOut: true },
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
  });

  it("saves a product, and can put it back in stock", async () => {
    await setSoldOut({
      ...input,
      kind: "product",
      itemId: "p-1",
      soldOut: false,
    });
    const [saved] = mocks.state.inserted;
    expect(saved!.values).toMatchObject({
      ingredientId: null,
      productId: "p-1",
      isSoldOut: false,
    });
    expect(saved!.conflict).toEqual({
      target: [branchStock.branchId, branchStock.productId],
      set: { isSoldOut: false },
    });
  });

  it("refuses another branch for a barista, and allows it for an admin", async () => {
    const other = { ...input, branchId: "b-tipas" };
    expect((await setSoldOut(other)).ok).toBe(false);
    expect(mocks.state.inserted).toEqual([]);
    expect(mocks.updateTag).not.toHaveBeenCalled();

    mocks.requireRole.mockResolvedValue(admin);
    expect((await setSoldOut(other)).ok).toBe(true);
  });

  it("rejects a missing item and bad input", async () => {
    mocks.state.selects = [[]];
    expect((await setSoldOut(input)).ok).toBe(false);
    expect((await setSoldOut({ ...input, soldOut: "yes" })).ok).toBe(false);
    expect((await setSoldOut({ ...input, kind: "branch" })).ok).toBe(false);
    expect(mocks.state.inserted).toEqual([]);
  });
});
