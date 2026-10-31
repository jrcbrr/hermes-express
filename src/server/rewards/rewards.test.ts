import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedSnapshot } from "@/test/catalog-fixture";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return { ...mockDb(), requireUser: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));

const { claimPerfectPour, markBadgesSeen } = await import("./actions");
const { listUnseenBadges, markBadgesSeenFor, recordOrderBadges } =
  await import("./badges");
const { listEarnedBadges, listPointsHistory } = await import("./queries");

const NOON = new Date("2026-11-15T12:00:00+08:00");
const line = {
  kind: "custom" as const,
  productSlug: null,
  name: "Monday Fuel",
  config: {
    drink: {
      size: "12oz" as const,
      temperature: "hot" as const,
      base: "latte",
      milk: "oat",
      milkAmount: "regular" as const,
      sweetness: 50 as const,
      syrups: [],
      toppings: [],
      name: "Monday Fuel",
    },
    details: [],
  },
  unitPriceCentavos: 16000,
  quantity: 1,
  lineTotalCentavos: 16000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordOrderBadges", () => {
  it("saves the stats and the badges earned", async () => {
    mocks.state.selects = [[], [{ value: 1 }]];
    await recordOrderBadges("u1", [line], seedSnapshot(), NOON);
    expect(mocks.state.inserted[0]).toMatchObject({
      userId: "u1",
      customDrinksBuilt: 1,
      basesTried: ["latte"],
    });
    expect(mocks.state.inserted[1]).toEqual([
      { userId: "u1", badgeKey: "first_sip" },
      { userId: "u1", badgeKey: "named_it" },
    ]);
  });

  it("adds to existing stats", async () => {
    mocks.state.selects = [
      [{ customDrinksBuilt: 4, basesTried: ["mocha"], milksTried: [] }],
      [{ value: 2 }],
    ];
    await recordOrderBadges("u1", [line], seedSnapshot(), NOON);
    expect(mocks.state.inserted[0]).toMatchObject({
      customDrinksBuilt: 5,
      basesTried: ["mocha", "latte"],
    });
  });

  it("writes no badges when none are earned", async () => {
    mocks.state.selects = [[], []];
    await recordOrderBadges("u1", [], seedSnapshot(), NOON);
    expect(mocks.state.inserted).toHaveLength(1);
  });

  it("logs a failure instead of breaking the order", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.state.selects = [[]];
    const broken = {
      ...seedSnapshot(),
      get products(): never {
        throw new Error("boom");
      },
    };
    await expect(
      recordOrderBadges(
        "u1",
        [{ ...line, config: { productSlug: "x", details: [] } }],
        broken,
        NOON,
      ),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});

describe("badge reads and seen flags", () => {
  it("lists unseen and earned badges", async () => {
    mocks.state.selects = [
      [{ badgeKey: "first_sip" }],
      [{ badgeKey: "regular" }],
    ];
    expect(await listUnseenBadges("u1")).toEqual(["first_sip"]);
    expect(await listEarnedBadges("u1")).toEqual(["regular"]);
  });

  it("marks badges seen, and skips an empty list", async () => {
    await markBadgesSeenFor("u1", []);
    expect(mocks.state.sets).toEqual([]);
    await markBadgesSeenFor("u1", ["first_sip"]);
    expect(mocks.state.sets[0]).toHaveProperty("seenAt");
  });

  it("lists points history", async () => {
    mocks.state.selects = [[{ id: "l1" }]];
    expect(await listPointsHistory("u1")).toEqual([{ id: "l1" }]);
  });
});

describe("claimPerfectPour", () => {
  it("needs a signed-in user", async () => {
    mocks.requireUser.mockRejectedValue(new Error("redirect"));
    await expect(claimPerfectPour()).rejects.toThrow("redirect");
    expect(mocks.state.inserted).toEqual([]);
  });

  it("gives the signed-in user the badge, already seen", async () => {
    expect(await claimPerfectPour()).toEqual({ newlyEarned: true });
    expect(mocks.state.inserted[0]).toMatchObject({
      userId: "u1",
      badgeKey: "perfect_pour",
      seenAt: expect.any(Date),
    });
  });

  it("says when the badge was already held", async () => {
    mocks.state.insertRows = [];
    expect(await claimPerfectPour()).toEqual({ newlyEarned: false });
  });
});

describe("markBadgesSeen", () => {
  it("requires login", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(markBadgesSeen(["first_sip"])).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.state.sets).toEqual([]);
  });

  it("marks the signed-in user's badges", async () => {
    await markBadgesSeen(["first_sip"]);
    expect(mocks.state.sets).toHaveLength(1);
  });

  it("ignores bad input", async () => {
    await markBadgesSeen("everything");
    expect(mocks.state.sets).toEqual([]);
  });
});
