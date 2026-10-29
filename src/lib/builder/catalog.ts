/**
 * The catalog in the shape the coffee builder needs: the options for each
 * step, their prices and colours, and the rules the builder enforces. Made on
 * the server from the cached snapshot and sent to the browser once.
 */
import {
  isAvailableNow,
  toPricingCatalog,
  type CatalogIngredient,
  type CatalogSnapshot,
} from "@/lib/catalog";
import { EXTRA_SHOT_SLUG, type PricingCatalog } from "@/lib/pricing";
import {
  DRINK_SIZES,
  DRINK_TEMPERATURES,
  type DrinkConfig,
  type DrinkSize,
  type DrinkTemperature,
} from "@/lib/validation/drink";

export type BuilderOption<Slug extends string = string> = {
  slug: Slug;
  name: string;
  priceCentavos: number;
  /** Layer colour (#RRGGBB); null for options that are not liquids. */
  color: string | null;
  /** Bases only: shots included in the price, or null when it takes none. */
  includedShots: number | null;
};

export type BuilderSignature = {
  slug: string;
  name: string;
  recipe: DrinkConfig;
};

export type BuilderCatalog = {
  sizes: BuilderOption<DrinkSize>[];
  temperatures: BuilderOption<DrinkTemperature>[];
  bases: BuilderOption[];
  milks: BuilderOption[];
  syrups: BuilderOption[];
  toppings: BuilderOption[];
  /** Price of each extra espresso shot; null when the shot row is missing or off. */
  extraShotCentavos: number | null;
  pricing: PricingCatalog;
  signatures: BuilderSignature[];
};

function toOption<Slug extends string>(
  ingredient: CatalogIngredient & { slug: Slug },
): BuilderOption<Slug> {
  return {
    slug: ingredient.slug,
    name: ingredient.name,
    priceCentavos: ingredient.priceCentavos,
    color: ingredient.color,
    includedShots: ingredient.includedShots,
  };
}

function isOneOf<T extends string>(
  values: readonly T[],
): (i: CatalogIngredient) => i is CatalogIngredient & { slug: T } {
  return (i): i is CatalogIngredient & { slug: T } =>
    (values as readonly string[]).includes(i.slug);
}

/** Active options of each kind, in menu order, plus available signature recipes. */
export function toBuilderCatalog(
  snapshot: CatalogSnapshot,
  now: Date,
): BuilderCatalog {
  const active = snapshot.ingredients
    .filter((i) => i.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const ofKind = (kind: CatalogIngredient["kind"]) =>
    active.filter((i) => i.kind === kind).map(toOption);
  const shot = active.find((i) => i.slug === EXTRA_SHOT_SLUG);

  return {
    sizes: active
      .filter((i) => i.kind === "size")
      .filter(isOneOf(DRINK_SIZES))
      .map(toOption),
    temperatures: active
      .filter((i) => i.kind === "temperature")
      .filter(isOneOf(DRINK_TEMPERATURES))
      .map(toOption),
    bases: ofKind("base"),
    milks: ofKind("milk"),
    syrups: ofKind("syrup"),
    toppings: ofKind("topping"),
    extraShotCentavos: shot ? shot.priceCentavos : null,
    pricing: toPricingCatalog(snapshot),
    signatures: snapshot.products.flatMap((p) =>
      p.type === "signature" && p.recipe !== null && isAvailableNow(p, now)
        ? [{ slug: p.slug, name: p.name, recipe: p.recipe }]
        : [],
    ),
  };
}

/** Every option slug, for looking up names and colours. */
export function optionIndex(
  catalog: BuilderCatalog,
): ReadonlyMap<string, BuilderOption> {
  return new Map(
    [
      ...catalog.sizes,
      ...catalog.temperatures,
      ...catalog.bases,
      ...catalog.milks,
      ...catalog.syrups,
      ...catalog.toppings,
    ].map((o) => [o.slug, o]),
  );
}
