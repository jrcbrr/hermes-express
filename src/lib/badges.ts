/**
 * Badges (docs/PLAN.md §5). Definitions live here, not in the database. Pure
 * functions: the server loads a customer's stats and records what they unlock.
 */
import type { CatalogSnapshot } from "./catalog";
import type { OrderLine } from "./orders";
import { MANILA_TIME_ZONE } from "./schedule";
import type { DrinkConfig } from "./validation/drink";

export const BADGES = [
  {
    key: "first_sip",
    name: "First Sip",
    description: "Place your first order.",
  },
  { key: "regular", name: "Regular", description: "Place 5 orders." },
  {
    key: "master_barista",
    name: "Master Barista",
    description: "Build 10 custom drinks.",
  },
  {
    key: "milk_explorer",
    name: "Milk Explorer",
    description: "Order with every milk type.",
  },
  {
    key: "olympian_taste",
    name: "Olympian Taste",
    description: "Try every base.",
  },
  {
    key: "perfect_pour",
    name: "Perfect Pour",
    description: "Win the mini-game.",
  },
  {
    key: "early_bird",
    name: "Early Bird",
    description: "Order before 8:00 AM.",
  },
  { key: "night_owl", name: "Night Owl", description: "Order after 9:00 PM." },
  { key: "named_it", name: "Named It", description: "Name a custom drink." },
] as const;

export type BadgeKey = (typeof BADGES)[number]["key"];

export type UserStats = {
  customDrinksBuilt: number;
  basesTried: string[];
  milksTried: string[];
};

export const EMPTY_STATS: UserStats = {
  customDrinksBuilt: 0,
  basesTried: [],
  milksTried: [],
};

const unique = (values: readonly string[]) => [...new Set(values)];

/** The recipe of each drink in an order: built ones and signature ones. */
function drinksIn(
  lines: readonly OrderLine[],
  snapshot: CatalogSnapshot,
): DrinkConfig[] {
  return lines.flatMap((line) => {
    if (line.config.drink) return [line.config.drink];
    const recipe = snapshot.products.find(
      (p) => p.slug === line.config.productSlug,
    )?.recipe;
    return recipe ? [recipe] : [];
  });
}

/** A customer's stats once this order is counted. */
export function statsAfterOrder(
  stats: UserStats,
  lines: readonly OrderLine[],
  snapshot: CatalogSnapshot,
): UserStats {
  const drinks = drinksIn(lines, snapshot);
  return {
    customDrinksBuilt:
      stats.customDrinksBuilt +
      lines
        .filter((line) => line.kind === "custom")
        .reduce((count, line) => count + line.quantity, 0),
    basesTried: unique([...stats.basesTried, ...drinks.map((d) => d.base)]),
    milksTried: unique([...stats.milksTried, ...drinks.map((d) => d.milk)]),
  };
}

const manilaHour = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** True when every listed option has been tried, and the list isn't empty. */
function triedAll(tried: readonly string[], all: readonly string[]): boolean {
  return all.length > 0 && all.every((slug) => tried.includes(slug));
}

/**
 * Badges this order earns, including ones the customer already has. Perfect
 * Pour is not here: only the mini-game unlocks it (awardPerfectPour).
 */
export function badgesForOrder({
  stats,
  orderCount,
  lines,
  snapshot,
  now,
}: {
  /** After this order. */
  stats: UserStats;
  /** Including this order. */
  orderCount: number;
  lines: readonly OrderLine[];
  snapshot: CatalogSnapshot;
  now: Date;
}): BadgeKey[] {
  const active = (kind: string) =>
    snapshot.ingredients
      .filter((i) => i.kind === kind && i.isActive && i.slug !== "none")
      .map((i) => i.slug);
  const hour = Number(manilaHour.format(now));
  const checks: [BadgeKey, boolean][] = [
    ["first_sip", orderCount >= 1],
    ["regular", orderCount >= 5],
    ["master_barista", stats.customDrinksBuilt >= 10],
    ["milk_explorer", triedAll(stats.milksTried, active("milk"))],
    ["olympian_taste", triedAll(stats.basesTried, active("base"))],
    ["early_bird", hour < 8],
    ["night_owl", hour >= 21],
    ["named_it", lines.some((line) => line.config.drink?.name !== undefined)],
  ];
  return checks.filter(([, earned]) => earned).map(([key]) => key);
}

export function badgeName(key: string): string {
  return BADGES.find((badge) => badge.key === key)?.name ?? key;
}
