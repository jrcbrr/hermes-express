import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { selects: [] as unknown[][] };
  const db = {
    select: vi.fn(() => {
      const rows = state.selects.shift() ?? [];
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: () => Object.assign(Promise.resolve(rows), chain),
        orderBy: async () => rows,
      };
      return chain;
    }),
  };
  return { db, state };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const { getOrderForUser } = await import("./queries");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const row = {
  order: { id: ID, userId: "u1", branchId: "b-bgc", code: "HX-7K2P" },
  branchName: "BGC",
  branchAddress: "High Street Kiosk",
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
      branchName: "BGC",
      branchAddress: "High Street Kiosk",
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
