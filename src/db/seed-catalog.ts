// Seeds branches, ingredients, products, promo codes and demo stock flags.
// Needs no secrets, so it also runs in the Vercel build (vercel.json) on every
// deploy. It only INSERTS rows that are missing (matched by slug or code) and
// never updates existing ones, so menu changes made by the admin are kept. The
// one exception: a product with no photo yet gets its default photo.
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { siteConfig } from "@/config/site";
import {
  ingredientSeeds,
  productImageUrl,
  productSeeds,
  promoSeeds,
  stockSeeds,
} from "./catalog-data";
import type { Database } from "./index";
import { branch, branchStock, ingredient, product, promoCode } from "./schema";

/** Position of each seed within its group (kind or type), for menu order. */
function sortOrders<T>(items: readonly T[], group: (item: T) => string) {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const key = group(item);
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next * 10;
  });
}

export async function seedCatalog(
  db: Database,
  log: (message: string) => void = console.log,
): Promise<void> {
  const branches = await db
    .insert(branch)
    .values(
      siteConfig.branches.map((b) => ({
        id: randomUUID(),
        slug: b.slug,
        name: b.name,
        address: b.address,
        opensAt: b.opensAt,
        closesAt: b.closesAt,
      })),
    )
    .onConflictDoNothing({ target: branch.slug })
    .returning({ id: branch.id });
  log(`  ✓ branches: ${branches.length} added`);

  const ingredientOrder = sortOrders(ingredientSeeds, (i) => i.kind);
  const ingredients = await db
    .insert(ingredient)
    .values(
      ingredientSeeds.map((i, n) => ({
        id: randomUUID(),
        kind: i.kind,
        slug: i.slug,
        name: i.name,
        priceCentavos: i.priceCentavos,
        color: i.color,
        includedShots: i.includedShots ?? null,
        sortOrder: ingredientOrder[n],
      })),
    )
    .onConflictDoNothing({ target: ingredient.slug })
    .returning({ id: ingredient.id });
  log(`  ✓ ingredients: ${ingredients.length} added`);

  const productOrder = sortOrders(productSeeds, (p) => p.type);
  const products = await db
    .insert(product)
    .values(
      productSeeds.map((p, n) => ({
        id: randomUUID(),
        type: p.type,
        slug: p.slug,
        name: p.name,
        description: p.description,
        priceCentavos: p.priceCentavos,
        imageUrl: productImageUrl(p.slug),
        recipe: p.recipe ?? null,
        isSeasonal: p.isSeasonal ?? false,
        availableFrom: p.availableFrom ?? null,
        availableTo: p.availableTo ?? null,
        sortOrder: productOrder[n],
      })),
    )
    .onConflictDoNothing({ target: product.slug })
    .returning({ id: product.id });
  log(`  ✓ products: ${products.length} added`);

  // Products seeded before photos existed have no image yet. Fill only empty
  // ones, so a photo the admin chose is never replaced.
  const photos = await Promise.all(
    productSeeds.map((p) =>
      db
        .update(product)
        .set({ imageUrl: productImageUrl(p.slug) })
        .where(and(eq(product.slug, p.slug), isNull(product.imageUrl)))
        .returning({ id: product.id }),
    ),
  );
  log(`  ✓ product photos: ${photos.flat().length} filled`);

  const promos = await db
    .insert(promoCode)
    .values(
      promoSeeds.map((p) => ({
        id: randomUUID(),
        code: p.code,
        type: p.type,
        value: p.value,
        maxDiscountCentavos: p.maxDiscountCentavos ?? null,
        minSubtotalCentavos: p.minSubtotalCentavos ?? 0,
        firstOrderOnly: p.firstOrderOnly ?? false,
        startsAt: p.startsAt ?? null,
        endsAt: p.endsAt ?? null,
      })),
    )
    .onConflictDoNothing({ target: promoCode.code })
    .returning({ id: promoCode.id });
  log(`  ✓ promo codes: ${promos.length} added`);

  // Stock flags point at rows by id, so look the ids up by slug.
  const branchIds = new Map(
    (
      await db
        .select({ id: branch.id, slug: branch.slug })
        .from(branch)
        .where(
          inArray(
            branch.slug,
            stockSeeds.map((s) => s.branchSlug),
          ),
        )
    ).map((row) => [row.slug, row.id]),
  );
  const productIds = new Map(
    (
      await db
        .select({ id: product.id, slug: product.slug })
        .from(product)
        .where(
          inArray(
            product.slug,
            stockSeeds.map((s) => s.productSlug),
          ),
        )
    ).map((row) => [row.slug, row.id]),
  );
  const stockRows = stockSeeds.flatMap((s) => {
    const branchId = branchIds.get(s.branchSlug);
    const productId = productIds.get(s.productSlug);
    return branchId && productId
      ? [{ id: randomUUID(), branchId, productId, isSoldOut: true }]
      : [];
  });
  const stock =
    stockRows.length === 0
      ? []
      : await db
          .insert(branchStock)
          .values(stockRows)
          .onConflictDoNothing()
          .returning({ id: branchStock.id });
  log(`  ✓ sold-out flags: ${stock.length} added`);
}
