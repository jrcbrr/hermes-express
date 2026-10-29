import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => {
  const state = { selects: [] as unknown[][] };
  const db = {
    select: vi.fn(() => {
      const rows = state.selects.shift() ?? [];
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: vi.fn(() => Object.assign(Promise.resolve(rows), chain)),
        orderBy: async () => rows,
      };
      return chain;
    }),
  };
  return { db, state };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const { getOrderForUser, listReceiptsForUser } = await import("./queries");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const row = {
  order: { id: ID, userId: "u1", branchId: "b-bgc", code: "HX-7K2P" },
  branchSlug: "bgc",
  branchName: "BGC",
  branchAddress: "High Street Kiosk",
  promoCode: null,
};
const items = [{ id: "i1", name: "Custom Latte" }];

const customer = { id: "u1", role: "customer", branchId: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.selects = [[row], items];
});

describe("getOrderForUser", () => {
  it("returns the customer's own order with its branch and items", async () => {
    expect(await getOrderForUser(ID, customer)).toEqual({
      ...row.order,
      branchSlug: "bgc",
      branchName: "BGC",
      branchAddress: "High Street Kiosk",
      promoCode: null,
      items,
    });
  });

  it("hides other customers' orders", async () => {
    expect(await getOrderForUser(ID, { ...customer, id: "u2" })).toBeNull();
  });

  it("lets admins see any order and baristas their branch's", async () => {
    expect(
      await getOrderForUser(ID, { id: "a", role: "admin", branchId: null }),
    ).not.toBeNull();
    mocks.state.selects = [[row], items];
    expect(
      await getOrderForUser(ID, {
        id: "b",
        role: "barista",
        branchId: "b-bgc",
      }),
    ).not.toBeNull();
    mocks.state.selects = [[row], items];
    expect(
      await getOrderForUser(ID, {
        id: "b",
        role: "barista",
        branchId: "b-tipas",
      }),
    ).toBeNull();
  });

  it("returns null for missing orders and never queries for a malformed id", async () => {
    mocks.state.selects = [[]];
    expect(await getOrderForUser(ID, customer)).toBeNull();
    expect(await getOrderForUser("not-an-id", customer)).toBeNull();
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });
});

describe("listReceiptsForUser", () => {
  it("returns only the user's own orders", async () => {
    const receipts = [{ id: ID, receiptNumber: 3, branchSlug: "bgc" }];
    mocks.state.selects = [receipts];
    expect(await listReceiptsForUser("u1")).toEqual(receipts);

    const chain = mocks.db.select.mock.results[0]!.value as {
      where: ReturnType<typeof vi.fn>;
    };
    const condition = chain.where.mock.calls[0]![0] as SQL;
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toBe('"order"."user_id" = $1');
    expect(query.params).toEqual(["u1"]);
  });
});
