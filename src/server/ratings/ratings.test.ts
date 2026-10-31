import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return { ...mockDb(), requireUser: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));

const { rateItem } = await import("./actions");
const { listRatings } = await import("./queries");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const input = { orderItemId: ID, stars: 5, comment: "  Lovely.  " };
const completed = { orderId: "o1", userId: "u1", status: "completed" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.state.selects = [[completed]];
});

describe("rateItem", () => {
  it("requires login", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(rateItem(input)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.state.inserted).toEqual([]);
  });

  it("saves a rating", async () => {
    expect(await rateItem(input)).toEqual({ ok: true });
    expect(mocks.state.inserted[0]).toMatchObject({
      orderItemId: ID,
      userId: "u1",
      stars: 5,
      comment: "Lovely.",
    });
  });

  it.each([0, 6, 2.5, "5"])("rejects %j stars", async (stars) => {
    expect((await rateItem({ ...input, stars })).ok).toBe(false);
    expect(mocks.state.inserted).toEqual([]);
  });

  it("rejects a comment that is too long", async () => {
    const result = await rateItem({ ...input, comment: "x".repeat(301) });
    expect(result.ok).toBe(false);
  });

  it("treats someone else's order like a missing item", async () => {
    mocks.state.selects = [[{ ...completed, userId: "other" }]];
    const other = await rateItem(input);
    mocks.state.selects = [[]];
    const missing = await rateItem(input);
    expect(other).toEqual(missing);
    expect(mocks.state.inserted).toEqual([]);
  });

  it.each(["received", "brewing", "cancelled"])(
    "refuses while the order is %s",
    async (status) => {
      mocks.state.selects = [[{ ...completed, status }]];
      expect((await rateItem(input)).ok).toBe(false);
      expect(mocks.state.inserted).toEqual([]);
    },
  );

  it("rates an item only once", async () => {
    mocks.state.insertRows = [];
    expect(await rateItem(input)).toEqual({
      ok: false,
      message: "You have already rated this item.",
    });
  });
});

describe("listRatings", () => {
  it("skips the query with no items", async () => {
    expect(await listRatings("u1", [])).toEqual([]);
  });

  it("returns the rows", async () => {
    mocks.state.selects = [[{ orderItemId: ID, stars: 4 }]];
    expect(await listRatings("u1", [ID])).toEqual([
      { orderItemId: ID, stars: 4 },
    ]);
  });
});
