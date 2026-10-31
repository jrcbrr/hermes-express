/**
 * Pure helpers for the admin area: Manila calendar days, list filters, search
 * terms, slugs and the summary cards.
 */
import { siteConfig } from "@/config/site";
import { isOrderStatus, type OrderStatus } from "./order-status";
import { MANILA_TIME_ZONE } from "./schedule";

export const ADMIN_PAGE_SIZE = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

const manilaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Manila calendar day a moment falls on, as "YYYY-MM-DD". */
export function manilaDateString(date: Date): string {
  return manilaDate.format(date);
}

/** First and last millisecond of a Manila day, or null if it isn't a real date. */
export function manilaDayRange(day: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00+08:00`);
  // Rejects days like 2026-02-31, which some parsers roll into March.
  if (Number.isNaN(start.getTime()) || manilaDateString(start) !== day) {
    return null;
  }
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/** The first value of a search param. */
function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A page number from the URL: anything odd means page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const page = Number(single(value));
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export type OrderFilters = {
  branch: string | null;
  status: OrderStatus | null;
  date: string | null;
  page: number;
};

/** The orders filters from the URL. Unknown values are ignored, not errors. */
export function parseOrderFilters(params: {
  branch?: string | string[];
  status?: string | string[];
  date?: string | string[];
  page?: string | string[];
}): OrderFilters {
  const branch = single(params.branch);
  const status = single(params.status);
  const date = single(params.date);
  return {
    branch: siteConfig.branches.some((b) => b.slug === branch)
      ? (branch ?? null)
      : null,
    status: status && isOrderStatus(status) ? status : null,
    date: date && manilaDayRange(date) ? date : null,
    page: parsePage(params.page),
  };
}

/** Makes a search term literal inside an SQL LIKE pattern. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Phones are stored as +639XXXXXXXXX, but people search "0917 123". Returns the
 * stored form of what was typed, or null if it doesn't look like a phone.
 */
export function phoneSearchTerm(term: string): string | null {
  const digits = term.replace(/[\s\-().]/g, "");
  if (/^0\d+$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^\+?63\d+$/.test(digits)) return `+${digits.replace("+", "")}`;
  return null;
}

/** "Hermes' Café Latte" -> "hermes-cafe-latte". Never empty. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

/** `base`, or `base-2`, `base-3`… when it is already taken. */
export function uniqueSlug(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Options the builder itself relies on, so they can't be switched off: every
 * new drink starts as 12oz and hot, and "no milk chosen" is priced as "none"
 * (src/lib/builder/state.ts).
 */
export const BUILDER_REQUIRED_SLUGS: readonly string[] = [
  "12oz",
  "hot",
  "none",
];

/** Kinds that must keep one active option, or no valid drink can be built. */
export const REQUIRED_INGREDIENT_KINDS: readonly string[] = [
  "size",
  "temperature",
  "base",
  "milk",
];

export type BranchSales = {
  slug: string;
  name: string;
  orders: number;
  revenueCentavos: number;
  averageCentavos: number;
};

export type SalesSummary = { overall: BranchSales; branches: BranchSales[] };

/** Average order value in whole centavos; 0 with no orders. */
function withAverage(row: Omit<BranchSales, "averageCentavos">): BranchSales {
  return {
    ...row,
    averageCentavos:
      row.orders === 0 ? 0 : Math.round(row.revenueCentavos / row.orders),
  };
}

/** Turns per-branch totals into the summary cards, adding the overall card. */
export function buildSalesSummary(
  rows: readonly Omit<BranchSales, "averageCentavos">[],
): SalesSummary {
  return {
    branches: rows.map(withAverage),
    overall: withAverage({
      slug: "all",
      name: "All branches",
      orders: rows.reduce((total, row) => total + row.orders, 0),
      revenueCentavos: rows.reduce(
        (total, row) => total + row.revenueCentavos,
        0,
      ),
    }),
  };
}
