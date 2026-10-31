"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { savedDrink } from "@/db/schema";
import { toPricingCatalog } from "@/lib/catalog";
import { calculateDrinkPrice, PricingError } from "@/lib/pricing";
import { drinkConfigSchema } from "@/lib/validation/drink";
import { requireUser } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";

export type FavoriteResult = { ok: true } | { ok: false; message: string };

/** Far more than anyone needs; it only stops junk requests. */
const MAX_FAVORITES = 50;

const saveSchema = z.object({
  name: z.string().trim().max(40),
  config: drinkConfigSchema,
});

/** Saves a drink to the signed-in customer's favorites. Prices are never saved. */
export async function saveFavorite(input: unknown): Promise<FavoriteResult> {
  const user = await requireUser("/build");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "We could not save this drink." };
  }
  const { name, config } = parsed.data;

  const snapshot = await getCatalogSnapshot();
  try {
    calculateDrinkPrice(config, toPricingCatalog(snapshot));
  } catch (error) {
    if (!(error instanceof PricingError)) throw error;
    return {
      ok: false,
      message: "This drink can no longer be made as chosen.",
    };
  }
  const baseName =
    snapshot.ingredients.find((i) => i.slug === config.base)?.name ?? "Drink";

  const db = getDb();
  const [saved] = await db
    .select({ value: count() })
    .from(savedDrink)
    .where(eq(savedDrink.userId, user.id));
  if ((saved?.value ?? 0) >= MAX_FAVORITES) {
    return {
      ok: false,
      message: `You can save up to ${MAX_FAVORITES} drinks. Please remove one first.`,
    };
  }

  await db.insert(savedDrink).values({
    id: randomUUID(),
    userId: user.id,
    name: name || config.name || `Custom ${baseName}`,
    config,
  });
  revalidatePath("/favorites");
  return { ok: true };
}

/** Removes a favorite. Another customer's looks like a missing one. */
export async function removeFavorite(id: unknown): Promise<FavoriteResult> {
  const user = await requireUser("/favorites");
  const parsed = z.uuid().safeParse(id);
  const notFound = {
    ok: false,
    message: "We could not find this drink.",
  } as const;
  if (!parsed.success) return notFound;

  const removed = await getDb()
    .delete(savedDrink)
    .where(and(eq(savedDrink.id, parsed.data), eq(savedDrink.userId, user.id)))
    .returning({ id: savedDrink.id });
  if (removed.length === 0) return notFound;
  revalidatePath("/favorites");
  return { ok: true };
}
