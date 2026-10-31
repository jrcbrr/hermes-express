import { describe, expect, it } from "vitest";
import { seedSnapshot } from "@/test/catalog-fixture";
import {
  buildSalesSummary,
  escapeLike,
  manilaDateString,
  manilaDayRange,
  parseOrderFilters,
  parsePage,
  phoneSearchTerm,
  slugify,
  uniqueSlug,
  fillRevenueDays,
  lastManilaDays,
  shortDayLabel,
} from "./admin";
import { recipeOptions } from "./admin-recipe";

describe("Manila days", () => {
  it("names the Manila day, not the UTC one", () => {
    // 11 PM UTC on Oct 30 is already 7 AM on Oct 31 in Manila.
    expect(manilaDateString(new Date("2026-10-30T23:00:00Z"))).toBe(
      "2026-10-31",
    );
  });

  it("gives the first and last millisecond of the day", () => {
    const range = manilaDayRange("2026-10-31");
    expect(range?.start.toISOString()).toBe("2026-10-30T16:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2026-10-31T15:59:59.999Z");
  });

  it.each(["", "soon", "2026-13-01", "2026-02-31"])("rejects %j", (day) => {
    expect(manilaDayRange(day)).toBeNull();
  });
});

describe("parsePage", () => {
  it.each([
    ["3", 3],
    [["4", "9"], 4],
    [undefined, 1],
    ["0", 1],
    ["-2", 1],
    ["1.5", 1],
    ["abc", 1],
  ] as const)("reads %j as %i", (value, page) => {
    expect(parsePage(value as string | string[] | undefined)).toBe(page);
  });
});

describe("parseOrderFilters", () => {
  it("keeps valid filters", () => {
    expect(
      parseOrderFilters({
        branch: "bgc",
        status: "brewing",
        date: "2026-10-31",
        page: "2",
      }),
    ).toEqual({
      branch: "bgc",
      status: "brewing",
      date: "2026-10-31",
      page: 2,
    });
  });

  it("ignores unknown values", () => {
    expect(
      parseOrderFilters({ branch: "mars", status: "lost", date: "tomorrow" }),
    ).toEqual({ branch: null, status: null, date: null, page: 1 });
  });
});

describe("search terms", () => {
  it("makes LIKE wildcards literal", () => {
    expect(escapeLike(String.raw`50%_a\b`)).toBe(String.raw`50\%\_a\\b`);
  });

  it.each([
    ["0917 123", "+63917123"],
    ["+63 917", "+63917"],
    ["63917", "+63917"],
    ["Maria", null],
    ["917", null],
  ])("turns %j into the stored phone form", (term, expected) => {
    expect(phoneSearchTerm(term)).toBe(expected);
  });
});

describe("slugs", () => {
  it("makes a clean slug", () => {
    expect(slugify("Hermes' Café  Latte!")).toBe("hermes-cafe-latte");
  });

  it("is never empty", () => {
    expect(slugify("☕")).toBe("item");
  });

  it("adds a number when taken", () => {
    expect(uniqueSlug("latte", [])).toBe("latte");
    expect(uniqueSlug("latte", ["latte"])).toBe("latte-2");
    expect(uniqueSlug("latte", ["latte", "latte-2"])).toBe("latte-3");
  });
});

describe("buildSalesSummary", () => {
  it("averages each branch and adds an overall card", () => {
    const summary = buildSalesSummary([
      { slug: "bgc", name: "BGC", orders: 3, revenueCentavos: 100000 },
      { slug: "tipas", name: "Tipas", orders: 1, revenueCentavos: 20000 },
    ]);
    expect(summary.branches[0]?.averageCentavos).toBe(33333);
    expect(summary.overall).toMatchObject({
      orders: 4,
      revenueCentavos: 120000,
      averageCentavos: 30000,
    });
  });

  it("does not divide by zero", () => {
    const summary = buildSalesSummary([
      { slug: "bgc", name: "BGC", orders: 0, revenueCentavos: 0 },
    ]);
    expect(summary.overall.averageCentavos).toBe(0);
    expect(summary.branches[0]?.averageCentavos).toBe(0);
  });
});

describe("sales chart days", () => {
  it("counts back in Manila days, oldest first", () => {
    // 16:30 UTC on Oct 31 is already Nov 1 in Manila.
    expect(lastManilaDays(new Date("2026-10-31T16:30:00Z"), 3)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("labels a day without shifting it", () => {
    expect(shortDayLabel("2026-11-01")).toBe("Nov 1");
  });

  it("fills days with no sales with zero", () => {
    expect(
      fillRevenueDays(
        ["2026-10-30", "2026-10-31"],
        [{ day: "2026-10-31", revenueCentavos: 500 }],
      ),
    ).toEqual([
      { day: "2026-10-30", label: "Oct 30", revenueCentavos: 0 },
      { day: "2026-10-31", label: "Oct 31", revenueCentavos: 500 },
    ]);
  });
});

describe("recipeOptions", () => {
  const snapshot = seedSnapshot();
  const off = {
    ...snapshot,
    ingredients: snapshot.ingredients.map((i) =>
      i.slug === "vanilla" ? { ...i, isActive: false } : i,
    ),
  };
  const recipe = snapshot.products.find(
    (p) => p.slug === "ambrosia-matcha",
  )!.recipe;

  it("leaves out options that are off", () => {
    expect(recipeOptions(off, null).syrups.map((o) => o.slug)).not.toContain(
      "vanilla",
    );
  });

  it("keeps an off option the saved recipe already uses", () => {
    expect(recipeOptions(off, recipe).syrups.map((o) => o.slug)).toContain(
      "vanilla",
    );
  });
});
