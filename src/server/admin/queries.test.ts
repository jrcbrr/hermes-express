import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_PAGE_SIZE } from "@/lib/admin";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return mockDb();
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const {
  getTodaySummary,
  getPromo,
  getUserWithOrders,
  listPromos,
  listAdminOrders,
  listBranches,
  listUsers,
} = await import("./queries");

const filters = { branch: null, status: null, date: null, page: 1 };
const rows = (n: number) => Array.from({ length: n }, (_, id) => ({ id }));

beforeEach(() => mocks.reset());

describe("promos", () => {
  it("lists codes and finds one", async () => {
    mocks.state.selects = [[{ id: "p1" }], [{ id: "p1" }], []];
    expect(await listPromos()).toEqual([{ id: "p1" }]);
    expect(await getPromo("p1")).toEqual({ id: "p1" });
    expect(await getPromo("nope")).toBeNull();
  });
});

describe("listBranches", () => {
  it("returns the branches", async () => {
    mocks.state.selects = [[{ id: "b1" }]];
    expect(await listBranches()).toEqual([{ id: "b1" }]);
  });
});

describe("getTodaySummary", () => {
  it("builds the cards from the branch totals", async () => {
    mocks.state.selects = [
      [{ slug: "bgc", name: "BGC", orders: 2, revenueCentavos: 40000 }],
    ];
    const summary = await getTodaySummary(new Date("2026-10-31T02:00:00Z"));
    expect(summary.overall.averageCentavos).toBe(20000);
  });
});

describe("paging", () => {
  it("cuts the extra row and says more follow", async () => {
    mocks.state.selects = [rows(ADMIN_PAGE_SIZE + 1)];
    const result = await listAdminOrders(filters);
    expect(result.rows).toHaveLength(ADMIN_PAGE_SIZE);
    expect(result.hasMore).toBe(true);
  });

  it("applies every order filter", async () => {
    mocks.state.selects = [rows(1)];
    const result = await listAdminOrders({
      branch: "bgc",
      status: "brewing",
      date: "2026-10-31",
      page: 2,
    });
    expect(result).toMatchObject({ hasMore: false });
  });

  it.each(["", "Maria", "0917 123"])("lists users for %j", async (term) => {
    mocks.state.selects = [rows(ADMIN_PAGE_SIZE + 1)];
    const result = await listUsers(term, 1);
    expect(result.rows).toHaveLength(ADMIN_PAGE_SIZE);
    expect(result.hasMore).toBe(true);
  });

  it("says when no more users follow", async () => {
    mocks.state.selects = [rows(1)];
    expect((await listUsers("", 1)).hasMore).toBe(false);
  });
});

describe("getUserWithOrders", () => {
  it("returns the account and its orders", async () => {
    mocks.state.selects = [[{ id: "u1", name: "Maria" }], [{ id: "o1" }]];
    expect(await getUserWithOrders("u1")).toEqual({
      id: "u1",
      name: "Maria",
      orders: [{ id: "o1" }],
    });
  });

  it("returns null for a missing account", async () => {
    mocks.state.selects = [[]];
    expect(await getUserWithOrders("nope")).toBeNull();
  });
});
