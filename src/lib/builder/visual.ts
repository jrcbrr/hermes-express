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
  /** Share of the cup's height, 0–1. All layers together stay under 0.9. */
  share: number;
};

/** Used when an ingredient has no colour set (e.g. a new admin-added one). */
export const FALLBACK_LIQUID_COLOR = "#B88A5E";

const BASE_SHARE = 0.4;
const BASE_ALONE_SHARE = 0.72;
const EXTRA_SHOT_SHARE = 0.04;
const SYRUP_SHARE = 0.03;
const MILK_SHARE: Record<AmountLevel, number> = {
  light: 0.2,
  regular: 0.3,
  extra: 0.38,
};

/**
 * Bottom to top: syrups (heavy, they sink), the base, then milk. Without
 * milk the base fills more of the cup, so a black coffee looks full.
 */
export function cupLayers(
  draft: BuilderDraft,
  catalog: BuilderCatalog,
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

  return [
    ...draft.syrups.map((slug) => layer(`syrup:${slug}`, slug, SYRUP_SHARE)),
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

export type ToppingStyle = "foam" | "drizzle" | "sprinkle" | "bottom";

export type ToppingVisual = {
  slug: string;
  style: ToppingStyle;
  color: string;
};

const TOPPING_STYLES: Record<string, ToppingStyle> = {
  "whipped-cream": "foam",
  "cold-foam": "foam",
  "sea-salt-cream": "foam",
  "caramel-drizzle": "drizzle",
  "chocolate-drizzle": "drizzle",
  "cookie-crumble": "sprinkle",
  "cinnamon-dust": "sprinkle",
  "cocoa-powder": "sprinkle",
  "tapioca-pearls": "bottom",
  "coffee-jelly": "bottom",
  "nata-de-coco": "bottom",
};

/** How each topping is drawn. Unknown toppings are sprinkled on top. */
export function toppingVisuals(
  toppings: readonly string[],
  catalog: BuilderCatalog,
): ToppingVisual[] {
  const index = optionIndex(catalog);
  return toppings.map((slug) => ({
    slug,
    style: TOPPING_STYLES[slug] ?? "sprinkle",
    color: index.get(slug)?.color ?? FALLBACK_LIQUID_COLOR,
  }));
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
