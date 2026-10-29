// Test helper: the real PLAN §6 seed data as a catalog snapshot, so builder
// tests use the same prices and recipes as the app.
import { ingredientSeeds, productSeeds } from "@/db/catalog-data";
import type { CatalogSnapshot, SoldOutFlag } from "@/lib/catalog";

export function seedSnapshot(soldOut: SoldOutFlag[] = []): CatalogSnapshot {
  return {
    ingredients: ingredientSeeds.map((seed, index) => ({
      id: `i-${seed.slug}`,
      kind: seed.kind,
      slug: seed.slug,
      name: seed.name,
      priceCentavos: seed.priceCentavos,
      color: seed.color,
      includedShots: seed.includedShots ?? null,
      sortOrder: index,
      isActive: true,
    })),
    products: productSeeds.map((seed, index) => ({
      id: `p-${seed.slug}`,
      type: seed.type,
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      priceCentavos: seed.priceCentavos,
      imageUrl: null,
      recipe: seed.recipe ?? null,
      isSeasonal: seed.isSeasonal ?? false,
      availableFrom: seed.availableFrom ?? null,
      availableTo: seed.availableTo ?? null,
      sortOrder: index,
      isActive: true,
    })),
    soldOut,
  };
}

/** A sold-out flag for an ingredient at a branch. */
export function ingredientSoldOut(
  branchSlug: string,
  slug: string,
): SoldOutFlag {
  return { branchSlug, ingredientId: `i-${slug}`, productId: null };
}

export const FIXTURE_NOW = new Date("2026-11-15T10:00:00+08:00");
