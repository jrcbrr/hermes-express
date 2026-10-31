"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getDb } from "@/db";
import { ingredient } from "@/db/schema";
import { BUILDER_REQUIRED_SLUGS, REQUIRED_INGREDIENT_KINDS } from "@/lib/admin";
import { toFieldErrors } from "@/lib/validation/auth";
import { ingredientFormSchema } from "@/lib/validation/admin";
import { requireRole } from "@/server/auth/session";
import { formString } from "@/server/auth/request";
import { CATALOG_CACHE_TAG } from "@/server/catalog/queries";
import type { AdminFormState } from "./types";

/** Saves one builder option. Prices on existing orders stay as they were. */
export async function updateIngredient(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], "/admin/ingredients");

  const values = {
    id: formString(formData, "id"),
    name: formString(formData, "name"),
    price: formString(formData, "price"),
    color: formString(formData, "color"),
    sortOrder: formString(formData, "sortOrder"),
    isActive: formString(formData, "isActive"),
  };
  const parsed = ingredientFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }
  const { id, name, price, color, sortOrder, isActive } = parsed.data;

  const db = getDb();
  const [found] = await db
    .select({
      slug: ingredient.slug,
      kind: ingredient.kind,
      color: ingredient.color,
    })
    .from(ingredient)
    .where(eq(ingredient.id, id));
  if (!found) {
    return { errors: { form: "We could not find this option." }, values };
  }

  if (!isActive) {
    if (BUILDER_REQUIRED_SLUGS.includes(found.slug)) {
      return {
        errors: {
          isActive: "The builder needs this option, so it must stay on.",
        },
        values,
      };
    }
    if (REQUIRED_INGREDIENT_KINDS.includes(found.kind)) {
      const others = await db
        .select({ id: ingredient.id })
        .from(ingredient)
        .where(
          and(
            eq(ingredient.kind, found.kind),
            eq(ingredient.isActive, true),
            ne(ingredient.id, id),
          ),
        );
      if (others.length === 0) {
        return {
          errors: {
            isActive:
              "This is the last option of its kind, so it must stay on.",
          },
          values,
        };
      }
    }
  }

  await db
    .update(ingredient)
    .set({
      name,
      priceCentavos: price,
      // Options that aren't liquids have no colour in the cup.
      color: found.color === null ? null : color || found.color,
      sortOrder,
      isActive,
    })
    .where(eq(ingredient.id, id));

  updateTag(CATALOG_CACHE_TAG);
  revalidatePath("/admin", "layout");
  return { status: "saved" };
}
