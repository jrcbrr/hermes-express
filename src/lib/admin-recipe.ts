/** The options offered by the admin's signature-drink recipe form. */
import {
  recipeSlugs,
  type CatalogIngredient,
  type CatalogSnapshot,
  type IngredientKind,
} from "./catalog";
import type { DrinkConfig } from "./validation/drink";

export type RecipeOptionList = Record<
  "sizes" | "temperatures" | "bases" | "milks" | "syrups" | "toppings",
  { slug: string; name: string }[]
>;

/**
 * Active options of each kind, plus anything already in the saved recipe, so
 * an option that is off for now doesn't silently vanish from the drink.
 */
export function recipeOptions(
  snapshot: CatalogSnapshot,
  recipe: DrinkConfig | null,
): RecipeOptionList {
  const kept = new Set(recipe ? recipeSlugs(recipe) : []);
  const ofKind = (kind: IngredientKind) =>
    snapshot.ingredients
      .filter(
        (i: CatalogIngredient) =>
          i.kind === kind && (i.isActive || kept.has(i.slug)),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ slug, name }) => ({ slug, name }));
  return {
    sizes: ofKind("size"),
    temperatures: ofKind("temperature"),
    bases: ofKind("base"),
    milks: ofKind("milk"),
    syrups: ofKind("syrup"),
    toppings: ofKind("topping"),
  };
}
