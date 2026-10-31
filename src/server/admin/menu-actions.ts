"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { product } from "@/db/schema";
import { manilaDayRange, slugify, uniqueSlug } from "@/lib/admin";
import {
  PRODUCT_TYPES,
  recipeSlugs,
  toPricingCatalog,
  type CatalogSnapshot,
} from "@/lib/catalog";
import { calculateDrinkPrice, PricingError } from "@/lib/pricing";
import { toFieldErrors } from "@/lib/validation/auth";
import { productFormSchema } from "@/lib/validation/admin";
import { drinkConfigSchema, type DrinkConfig } from "@/lib/validation/drink";
import { requireRole } from "@/server/auth/session";
import { formString } from "@/server/auth/request";
import {
  CATALOG_CACHE_TAG,
  getCatalogSnapshot,
} from "@/server/catalog/queries";
import type { AdminActionResult, AdminFormState } from "./types";

const FIELDS = [
  "name",
  "description",
  "price",
  "isSeasonal",
  "availableFrom",
  "availableTo",
  "isActive",
] as const;
const RECIPE_FIELDS = [
  "recipeSize",
  "recipeTemperature",
  "recipeBase",
  "recipeMilk",
  "recipeSweetness",
] as const;

/** What was typed, kept so a failed save doesn't clear the form. */
function typedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of [...FIELDS, ...RECIPE_FIELDS]) {
    values[key] = formString(formData, key);
  }
  for (const key of ["recipeSyrups", "recipeToppings"]) {
    values[key] = formData.getAll(key).join(",");
  }
  return values;
}

/** Seasonal dates as stored: whole Manila days, or none when not seasonal. */
function seasonColumns(data: z.output<typeof productFormSchema>) {
  const from = data.isSeasonal ? manilaDayRange(data.availableFrom) : null;
  const to = data.isSeasonal ? manilaDayRange(data.availableTo) : null;
  return {
    isSeasonal: data.isSeasonal,
    availableFrom: from?.start ?? null,
    availableTo: to?.end ?? null,
  };
}

/**
 * The drink from the recipe section, checked against the catalog. Ingredients
 * already in the saved recipe count as active, so an ingredient that is off
 * for now doesn't stop an admin changing this drink's price.
 */
function parseRecipe(
  formData: FormData,
  snapshot: CatalogSnapshot,
  existing: DrinkConfig | null,
): { recipe: DrinkConfig } | { error: string } {
  const temperature = formString(formData, "recipeTemperature");
  const parsed = drinkConfigSchema.safeParse({
    size: formString(formData, "recipeSize"),
    temperature,
    base: formString(formData, "recipeBase"),
    milk: formString(formData, "recipeMilk"),
    milkAmount: existing?.milkAmount ?? "regular",
    sweetness: Number(formString(formData, "recipeSweetness")),
    syrups: formData.getAll("recipeSyrups"),
    toppings: formData.getAll("recipeToppings"),
    ...(temperature === "iced"
      ? { iceLevel: existing?.iceLevel ?? "regular" }
      : {}),
  });
  if (!parsed.success) {
    return { error: "Please choose every part of the recipe." };
  }

  const base = snapshot.ingredients.find((i) => i.slug === parsed.data.base);
  const recipe: DrinkConfig = {
    ...parsed.data,
    // Keep extra shots from the saved recipe while the base still takes shots.
    ...(existing?.shots !== undefined &&
    base?.includedShots !== null &&
    base?.includedShots !== undefined
      ? { shots: existing.shots }
      : {}),
  };

  const kept = new Set(existing ? recipeSlugs(existing) : []);
  const catalog = toPricingCatalog(snapshot);
  try {
    calculateDrinkPrice(recipe, {
      ...catalog,
      ingredients: catalog.ingredients.map((i) => ({
        ...i,
        isActive: i.isActive || kept.has(i.slug),
      })),
    });
  } catch (error) {
    if (error instanceof PricingError) return { error: error.message };
    throw error;
  }
  return { recipe };
}

/** Clears every cached catalog read, so customers see the change at once. */
function refreshCatalog() {
  updateTag(CATALOG_CACHE_TAG);
  revalidatePath("/admin", "layout");
}

export async function createProduct(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], "/admin/menu/new");
  const values = typedValues(formData);

  const type = z.enum(PRODUCT_TYPES).safeParse(formString(formData, "type"));
  const parsed = productFormSchema.safeParse(values);
  if (!type.success || !parsed.success) {
    return {
      errors: {
        ...(type.success ? {} : { type: "Please choose a type." }),
        ...(parsed.success ? {} : toFieldErrors(parsed.error)),
      },
      values: { ...values, type: formString(formData, "type") },
    };
  }

  const snapshot = await getCatalogSnapshot();
  let recipe: DrinkConfig | null = null;
  if (type.data === "signature") {
    const result = parseRecipe(formData, snapshot, null);
    if ("error" in result) {
      return {
        errors: { recipe: result.error },
        values: { ...values, type: type.data },
      };
    }
    recipe = result.recipe;
  }

  const taken = await getDb().select({ slug: product.slug }).from(product);
  const sameType = snapshot.products.filter((p) => p.type === type.data);
  const inserted = await getDb()
    .insert(product)
    .values({
      id: randomUUID(),
      type: type.data,
      name: parsed.data.name,
      slug: uniqueSlug(
        slugify(parsed.data.name),
        taken.map((row) => row.slug),
      ),
      description: parsed.data.description,
      priceCentavos: parsed.data.price,
      recipe,
      ...seasonColumns(parsed.data),
      sortOrder: Math.max(0, ...sameType.map((p) => p.sortOrder)) + 1,
      isActive: parsed.data.isActive,
    })
    .onConflictDoNothing()
    .returning({ id: product.id });
  if (inserted.length === 0) {
    return {
      errors: { form: "Another item was just saved. Please try again." },
      values: { ...values, type: type.data },
    };
  }

  refreshCatalog();
  redirect("/admin/menu");
}

/** Saves a product. Its slug and type never change: other data points at them. */
export async function updateProduct(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], "/admin/menu");
  const id = formString(formData, "id");
  const values = typedValues(formData);
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  const [found] = await getDb()
    .select({ type: product.type, recipe: product.recipe })
    .from(product)
    .where(eq(product.id, id));
  if (!found) {
    return { errors: { form: "We could not find this item." }, values };
  }

  let recipe = found.recipe;
  if (found.type === "signature") {
    const result = parseRecipe(
      formData,
      await getCatalogSnapshot(),
      found.recipe,
    );
    if ("error" in result) {
      return { errors: { recipe: result.error }, values };
    }
    recipe = result.recipe;
  }

  await getDb()
    .update(product)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      priceCentavos: parsed.data.price,
      recipe,
      ...seasonColumns(parsed.data),
      isActive: parsed.data.isActive,
    })
    .where(eq(product.id, id));

  refreshCatalog();
  return { status: "saved" };
}

const activeSchema = z.object({ id: z.string().min(1), active: z.boolean() });

/** Shows or hides a product on the menu. */
export async function setProductActive(
  input: unknown,
): Promise<AdminActionResult> {
  await requireRole(["admin"], "/admin/menu");
  const parsed = activeSchema.safeParse(input);
  const notFound = {
    ok: false,
    message: "We could not find this item.",
  } as const;
  if (!parsed.success) return notFound;

  const updated = await getDb()
    .update(product)
    .set({ isActive: parsed.data.active })
    .where(eq(product.id, parsed.data.id))
    .returning({ id: product.id });
  if (updated.length === 0) return notFound;

  refreshCatalog();
  return { ok: true };
}
