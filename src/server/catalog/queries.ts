// Catalog reads for Server Components. The whole catalog is small (about 70
// rows), so it is loaded in one cached snapshot and shaped by the pure
// functions in src/lib/catalog.ts.
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { branch, branchStock, ingredient, product } from "@/db/schema";
import {
  BRANCH_COOKIE,
  resolveBranchSlug,
  type CatalogSnapshot,
} from "@/lib/catalog";

/** Cache tag for every catalog read. Admin edits (Stage 7) call updateTag() with it. */
export const CATALOG_CACHE_TAG = "catalog";

/** Reads the catalog from Postgres, cached across requests for up to an hour. */
export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("hours");

  const db = getDb();
  const [ingredients, products, soldOut] = await Promise.all([
    db
      .select({
        id: ingredient.id,
        kind: ingredient.kind,
        slug: ingredient.slug,
        name: ingredient.name,
        priceCentavos: ingredient.priceCentavos,
        color: ingredient.color,
        includedShots: ingredient.includedShots,
        sortOrder: ingredient.sortOrder,
        isActive: ingredient.isActive,
      })
      .from(ingredient)
      .orderBy(asc(ingredient.sortOrder)),
    db
      .select({
        id: product.id,
        type: product.type,
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCentavos: product.priceCentavos,
        imageUrl: product.imageUrl,
        recipe: product.recipe,
        isSeasonal: product.isSeasonal,
        availableFrom: product.availableFrom,
        availableTo: product.availableTo,
        sortOrder: product.sortOrder,
        isActive: product.isActive,
      })
      .from(product)
      .orderBy(asc(product.sortOrder)),
    db
      .select({
        branchSlug: branch.slug,
        ingredientId: branchStock.ingredientId,
        productId: branchStock.productId,
      })
      .from(branchStock)
      .innerJoin(branch, eq(branchStock.branchId, branch.id))
      .where(eq(branchStock.isSoldOut, true)),
  ]);
  return { ingredients, products, soldOut };
}

/**
 * The catalog, or null when the database can't be reached (for example in CI,
 * which has no database). Pages show a polite message instead of crashing.
 */
export async function loadCatalog(): Promise<CatalogSnapshot | null> {
  try {
    return await getCatalogSnapshot();
  } catch (error) {
    console.error("Could not load the catalog:", error);
    return null;
  }
}

/** The branch the customer picked on /menu, or the first branch. */
export async function getSelectedBranchSlug(): Promise<string> {
  const store = await cookies();
  return resolveBranchSlug(store.get(BRANCH_COOKIE)?.value);
}
