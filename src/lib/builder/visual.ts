/**
 * Pure helpers that turn a drink into what the builder cup draws: liquid
 * layers with colours and heights, the mixed colour, toppings and ice.
 */
import type { AmountLevel, DrinkSize } from "@/lib/validation/drink";
import { optionIndex, type BuilderCatalog } from "./catalog";
import type { BuilderDraft } from "./state";

export type LiquidLayer = {
  /** Stable key for animation: "syrup:vanilla", "base", "milk". */
  key: string;
  slug: string;
  name: string;
  color: string;
  /** Share of the cup's height, 0–1. A finished drink totals BRIM_SHARE. */
  share: number;
};

/** A finished drink fills the cup right to the rim (the rim line covers its edge). */
export const BRIM_SHARE = 1;

/** Used when an ingredient has no colour set (e.g. a new admin-added one). */
export const FALLBACK_LIQUID_COLOR = "#B88A5E";

const BASE_SHARE = 0.4;
const BASE_ALONE_SHARE = 0.72;
const EXTRA_SHOT_SHARE = 0.04;
const SYRUP_SHARE = 0.03;
/** All syrups together stay a thin band, however many are chosen. */
const SYRUP_BAND = 0.09;
const MILK_SHARE: Record<AmountLevel, number> = {
  light: 0.2,
  regular: 0.3,
  extra: 0.38,
};

/**
 * Bottom to top: syrups (heavy, they sink), the base, then milk.
 *
 * While the drink is being built, the base pours in to about half the cup.
 * Once a milk is chosen (including "No milk") the drink is complete and its
 * liquids are scaled, keeping their proportions, to finish at `top`: the
 * brim, or lower when foam toppings take the last part of the cup.
 */
export function cupLayers(
  draft: BuilderDraft,
  catalog: BuilderCatalog,
  top: number = BRIM_SHARE,
): LiquidLayer[] {
  if (draft.base === null) return [];
  const index = optionIndex(catalog);
  const layer = (key: string, slug: string, share: number): LiquidLayer => {
    const option = index.get(slug);
    return {
      key,
      slug,
      name: option?.name ?? slug,
      color: option?.color ?? FALLBACK_LIQUID_COLOR,
      share,
    };
  };

  const base = index.get(draft.base);
  const extraShots = Math.max(
    0,
    (draft.shots ?? 0) - (base?.includedShots ?? 0),
  );
  const hasMilk = draft.milk !== null && draft.milk !== "none";
  const syrupShare = Math.min(
    SYRUP_SHARE,
    SYRUP_BAND / Math.max(1, draft.syrups.length),
  );

  const layers = [
    ...draft.syrups.map((slug) => layer(`syrup:${slug}`, slug, syrupShare)),
    layer(
      "base",
      draft.base,
      (draft.milk === "none" ? BASE_ALONE_SHARE : BASE_SHARE) +
        extraShots * EXTRA_SHOT_SHARE,
    ),
    ...(hasMilk
      ? [layer("milk", draft.milk!, MILK_SHARE[draft.milkAmount])]
      : []),
  ];
  if (draft.milk === null) return layers;

  const total = layers.reduce((sum, l) => sum + l.share, 0);
  return layers.map((l) => ({ ...l, share: (l.share * top) / total }));
}

/**
 * The share of the cup taken by foam toppings (Cold Foam, Sea Salt Cream),
 * so the liquid sits lower and the foam finishes at the brim.
 */
export function foamReserve(
  toppings: readonly ToppingVisual[],
  cupHeight: number,
): number {
  const foams = toppings.filter((t) => t.style === "foam").length;
  return (foams * FOAM_THICKNESS) / cupHeight;
}

/** Each layer with the share of the cup filled below it. */
export function stackLayers(
  layers: readonly LiquidLayer[],
): { layer: LiquidLayer; below: number }[] {
  return layers.map((layer, i) => ({
    layer,
    below: layers.slice(0, i).reduce((sum, l) => sum + l.share, 0),
  }));
}

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, "0");
}

/** The colour of the stirred drink: layer colours averaged by height. Null when empty. */
export function mixColor(layers: readonly LiquidLayer[]): string | null {
  const total = layers.reduce((sum, l) => sum + l.share, 0);
  if (total === 0) return null;
  const mixed = [0, 0, 0];
  for (const l of layers) {
    parseHex(l.color).forEach((channel, i) => {
      mixed[i]! += (channel * l.share) / total;
    });
  }
  return `#${mixed.map(toHex).join("")}`.toUpperCase();
}

/**
 * dollop: a piped swirl (whipped cream). foam: a soft dome on the drink.
 * drizzle: a sauce zig-zag with drips. dust: a fine powder. crumble: small
 * crumbs. pieces: pearls or cubes that sink to the bottom.
 */
export type ToppingStyle =
  "dollop" | "foam" | "drizzle" | "dust" | "crumble" | "pieces";

export type ToppingVisual = {
  slug: string;
  style: ToppingStyle;
  color: string;
};

const TOPPING_STYLES: Record<string, ToppingStyle> = {
  "whipped-cream": "dollop",
  "cold-foam": "foam",
  "sea-salt-cream": "foam",
  "caramel-drizzle": "drizzle",
  "chocolate-drizzle": "drizzle",
  "cookie-crumble": "crumble",
  "cinnamon-dust": "dust",
  "cocoa-powder": "dust",
  "tapioca-pearls": "pieces",
  "coffee-jelly": "pieces",
  "nata-de-coco": "pieces",
};

/** How each topping is drawn. Unknown toppings are dusted on top. */
export function toppingVisuals(
  toppings: readonly string[],
  catalog: BuilderCatalog,
): ToppingVisual[] {
  const index = optionIndex(catalog);
  return toppings.map((slug) => ({
    slug,
    style: TOPPING_STYLES[slug] ?? "dust",
    color: index.get(slug)?.color ?? FALLBACK_LIQUID_COLOR,
  }));
}

/** Thickness of one foam layer, and height of the whipped cream swirl (SVG units). */
export const FOAM_THICKNESS = 12;
export const DOLLOP_HEIGHT = 46;

/** A drink whose top is this close to the rim (SVG units) counts as full. */
const NEAR_RIM = 10;
/** The rim's line is drawn 2 units above the top of the glass. */
const RIM_LINE_OFFSET = 2;

export type ToppingLayout = {
  /** Top of the foam layers (the drink's surface when there is no foam). */
  foamTop: number;
  /** Where the whipped cream's base sits, or null without it. */
  dollopBase: number | null;
  /** Top of the whipped cream, or null without it. */
  dollopTop: number | null;
  /** Where drizzles and dusts sit, and how wide they spread. */
  crown: number;
  crownSpan: [number, number];
};

/**
 * Where toppings sit, given the drink's surface and the top of the glass
 * (SVG y, smaller is higher): foams stack on the drink, and drizzles and
 * dusts go on whatever is on top. Whipped cream sits on the rim when the
 * drink is full, like a real topped cup, otherwise on the drink.
 */
export function toppingLayout(
  toppings: readonly ToppingVisual[],
  surface: number,
  rim: number,
): ToppingLayout {
  const foams = toppings.filter((t) => t.style === "foam").length;
  const foamTop = surface - foams * FOAM_THICKNESS;
  if (!toppings.some((t) => t.style === "dollop")) {
    return {
      foamTop,
      dollopBase: null,
      dollopTop: null,
      crown: foamTop,
      crownSpan: [46, 154],
    };
  }
  const dollopBase =
    foamTop - rim <= NEAR_RIM ? rim - RIM_LINE_OFFSET : foamTop;
  return {
    foamTop,
    dollopBase,
    dollopTop: dollopBase - DOLLOP_HEIGHT,
    crown: dollopBase - 26,
    crownSpan: [72, 128],
  };
}

/**
 * A lighter (amount > 0, towards white) or darker (amount < 0, towards
 * black) version of a colour, for shading. amount is between -1 and 1.
 */
export function shade(hex: string, amount: number): string {
  const t = Math.min(1, Math.abs(amount));
  const target = amount >= 0 ? 255 : 0;
  return `#${parseHex(hex)
    .map((c) => toHex(c + (target - c) * t))
    .join("")}`.toUpperCase();
}

export type ScatterPoint = { x: number; y: number; size: number };

/**
 * `count` points with x, y and size between 0 and 1. The same seed always
 * gives the same points, so dust and crumbs don't jump around on re-render.
 */
export function scatter(count: number, seed: number): ScatterPoint[] {
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    size: next(),
  }));
}

/** A small whole number from a slug, used as a scatter seed. */
export function seedOf(slug: string): number {
  let hash = 7;
  for (const char of slug)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function iceCubeCount(level: AmountLevel | undefined): number {
  if (level === undefined) return 0;
  return { light: 2, regular: 3, extra: 5 }[level];
}

/** Cup height relative to the 22oz cup. */
export function cupScale(size: DrinkSize): number {
  return { "12oz": 0.82, "16oz": 0.91, "22oz": 1 }[size];
}

/** A short spoken description of the cup, e.g. "16oz iced Latte with Oat milk". */
export function describeDrink(
  draft: BuilderDraft,
  catalog: BuilderCatalog,
): string {
  if (draft.base === null) return `An empty ${draft.size} cup`;
  const index = optionIndex(catalog);
  const name = (slug: string) => index.get(slug)?.name ?? slug;
  const parts = [`${draft.size} ${draft.temperature} ${name(draft.base)}`];
  if (draft.milk !== null && draft.milk !== "none") {
    parts.push(`with ${name(draft.milk)}`);
  }
  if (draft.toppings.length > 0) {
    parts.push(`topped with ${draft.toppings.map(name).join(", ")}`);
  }
  return parts.join(" ");
}
