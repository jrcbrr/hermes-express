import { describe, expect, it } from "vitest";
import {
  BADGES,
  badgeName,
  badgesForOrder,
  EMPTY_STATS,
  statsAfterOrder,
  type UserStats,
} from "./badges";
import type { OrderLine } from "./orders";
import type { DrinkConfig } from "./validation/drink";
import { seedSnapshot } from "@/test/catalog-fixture";

const snapshot = seedSnapshot();
const NOON = new Date("2026-11-15T12:00:00+08:00");

const drink: DrinkConfig = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  milk: "oat",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
};
const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  kind: "custom",
  productSlug: null,
  name: "Custom Latte",
  config: { drink, details: [] },
  unitPriceCentavos: 16000,
  quantity: 2,
  lineTotalCentavos: 32000,
  ...over,
});
const earned = (
  over: Partial<Parameters<typeof badgesForOrder>[0]> = {},
): string[] =>
  badgesForOrder({
    stats: EMPTY_STATS,
    orderCount: 1,
    lines: [],
    snapshot,
    now: NOON,
    ...over,
  });

describe("statsAfterOrder", () => {
  it("counts custom cups and what was tried", () => {
    expect(statsAfterOrder(EMPTY_STATS, [line()], snapshot)).toEqual({
      customDrinksBuilt: 2,
      basesTried: ["latte"],
      milksTried: ["oat"],
    });
  });

  it("counts a signature's recipe as tried, but not as built", () => {
    const stats = statsAfterOrder(
      EMPTY_STATS,
      [
        line({
          kind: "product",
          config: { productSlug: "olympus-latte", details: [] },
        }),
      ],
      snapshot,
    );
    expect(stats.customDrinksBuilt).toBe(0);
    expect(stats.basesTried).toEqual(["latte"]);
  });

  it("ignores pastries, and adds no repeats", () => {
    const before: UserStats = {
      customDrinksBuilt: 1,
      basesTried: ["latte"],
      milksTried: ["oat"],
    };
    const stats = statsAfterOrder(
      before,
      [
        line({ quantity: 1 }),
        line({
          kind: "product",
          config: { productSlug: "butter-croissant", details: [] },
        }),
      ],
      snapshot,
    );
    expect(stats).toEqual({ ...before, customDrinksBuilt: 2 });
  });
});

describe("badgesForOrder", () => {
  it("defines every badge from the plan", () => {
    expect(BADGES).toHaveLength(9);
  });

  it("gives First Sip for the first order only of these", () => {
    expect(earned()).toEqual(["first_sip"]);
  });

  it("gives Regular from 5 orders", () => {
    expect(earned({ orderCount: 4 })).not.toContain("regular");
    expect(earned({ orderCount: 5 })).toContain("regular");
  });

  it("gives Master Barista from 10 built drinks", () => {
    const stats = (customDrinksBuilt: number) => ({
      ...EMPTY_STATS,
      customDrinksBuilt,
    });
    expect(earned({ stats: stats(9) })).not.toContain("master_barista");
    expect(earned({ stats: stats(10) })).toContain("master_barista");
  });

  it("needs every active milk, not counting no milk", () => {
    const milks = snapshot.ingredients
      .filter((i) => i.kind === "milk" && i.slug !== "none")
      .map((i) => i.slug);
    expect(
      earned({ stats: { ...EMPTY_STATS, milksTried: milks.slice(1) } }),
    ).not.toContain("milk_explorer");
    expect(earned({ stats: { ...EMPTY_STATS, milksTried: milks } })).toContain(
      "milk_explorer",
    );
  });

  it("needs every active base", () => {
    const bases = snapshot.ingredients
      .filter((i) => i.kind === "base")
      .map((i) => i.slug);
    expect(earned({ stats: { ...EMPTY_STATS, basesTried: bases } })).toContain(
      "olympian_taste",
    );
  });

  it("doesn't count a switched-off base against the customer", () => {
    const off = {
      ...snapshot,
      ingredients: snapshot.ingredients.map((i) =>
        i.slug === "matcha" ? { ...i, isActive: false } : i,
      ),
    };
    const bases = off.ingredients
      .filter((i) => i.kind === "base" && i.isActive)
      .map((i) => i.slug);
    expect(
      earned({
        snapshot: off,
        stats: { ...EMPTY_STATS, basesTried: bases },
      }),
    ).toContain("olympian_taste");
  });

  it("awards nothing for an empty list of options", () => {
    expect(
      earned({ snapshot: { ...snapshot, ingredients: [] } }),
    ).not.toContain("olympian_taste");
  });

  it.each([
    ["07:59", "early_bird", true],
    ["08:00", "early_bird", false],
    ["20:59", "night_owl", false],
    ["21:00", "night_owl", true],
  ])("at %s Manila time, %s is %s", (time, badge, expected) => {
    const now = new Date(`2026-11-15T${time}:00+08:00`);
    expect(earned({ now }).includes(badge)).toBe(expected);
  });

  it("gives Named It for a named drink", () => {
    expect(
      earned({
        lines: [
          line({
            config: { drink: { ...drink, name: "Monday Fuel" }, details: [] },
          }),
        ],
      }),
    ).toContain("named_it");
    expect(earned({ lines: [line()] })).not.toContain("named_it");
  });

  it("never gives Perfect Pour", () => {
    expect(earned({ orderCount: 99 })).not.toContain("perfect_pour");
  });
});

describe("badgeName", () => {
  it("finds the name, and falls back to the key", () => {
    expect(badgeName("first_sip")).toBe("First Sip");
    expect(badgeName("retired")).toBe("retired");
  });
});
