/**
 * "Surprise me": a random drink that is always valid and can be priced. It
 * only uses options that are available (not sold out) at the branch.
 */
import {
  AMOUNT_LEVELS,
  MAX_SHOTS,
  SWEETNESS_LEVELS,
  type DrinkConfig,
} from "@/lib/validation/drink";
import type { BuilderCatalog, BuilderOption } from "./catalog";
import { isNotServedHot } from "./state";

/** Returns a number in [0, 1), like Math.random. Tests pass a seeded one. */
export type Rng = () => number;

/** Most surprises stay sensible: at most 2 syrups and 3 toppings. */
const MAX_RANDOM_SYRUPS = 2;
const MAX_RANDOM_TOPPINGS = 3;

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

function intBetween(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Up to `max` different items, in random order. */
function pickSome<T>(items: readonly T[], max: number, rng: Rng): T[] {
  const pool = [...items];
  const count = intBetween(0, Math.min(max, pool.length), rng);
  const chosen: T[] = [];
  for (let i = 0; i < count; i++) {
    chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
  }
  return chosen;
}

/**
 * A random, valid drink built from scratch, or null when the branch has no
 * size, temperature, base or milk left to choose from.
 */
export function randomDrink(
  catalog: BuilderCatalog,
  unavailable: ReadonlySet<string>,
  rng: Rng = Math.random,
): DrinkConfig | null {
  const available = <S extends string>(options: BuilderOption<S>[]) =>
    options.filter((o) => !unavailable.has(o.slug));

  const sizes = available(catalog.sizes);
  const temperatures = available(catalog.temperatures);
  const milks = available(catalog.milks);
  const canServeColdOnly = temperatures.some((t) => t.slug !== "hot");
  const bases = available(catalog.bases).filter(
    (b) => !isNotServedHot(b.slug) || canServeColdOnly,
  );
  if (
    sizes.length === 0 ||
    temperatures.length === 0 ||
    milks.length === 0 ||
    bases.length === 0
  ) {
    return null;
  }

  const base = pickOne(bases, rng);
  const temperature = pickOne(
    isNotServedHot(base.slug)
      ? temperatures.filter((t) => t.slug !== "hot")
      : temperatures,
    rng,
  ).slug;

  const config: DrinkConfig = {
    size: pickOne(sizes, rng).slug,
    temperature,
    base: base.slug,
    milk: pickOne(milks, rng).slug,
    milkAmount: pickOne(AMOUNT_LEVELS, rng),
    sweetness: pickOne(SWEETNESS_LEVELS, rng),
    syrups: pickSome(available(catalog.syrups), MAX_RANDOM_SYRUPS, rng).map(
      (s) => s.slug,
    ),
    toppings: pickSome(
      available(catalog.toppings),
      MAX_RANDOM_TOPPINGS,
      rng,
    ).map((t) => t.slug),
  };
  if (temperature === "iced") config.iceLevel = pickOne(AMOUNT_LEVELS, rng);
  // Extra shots need the shot row; without it, keep the included shots.
  if (base.includedShots !== null) {
    config.shots =
      catalog.extraShotCentavos === null
        ? base.includedShots
        : intBetween(
            base.includedShots,
            Math.min(MAX_SHOTS, base.includedShots + 1),
            rng,
          );
  }
  return config;
}
