/**
 * Where the builder starts, from the page's query string:
 * - `?from=<slug>` (or the older `?drink=<slug>`): a signature drink's recipe.
 * - `?edit=<cartItemId>`: a cart item to change (the cart arrives in Stage 5).
 * - nothing: an empty cup.
 */
import type { BuilderCatalog } from "./catalog";
import { draftFromRecipe, EMPTY_DRAFT, type BuilderDraft } from "./state";

export type SearchParams = Record<string, string | string[] | undefined>;

export type BuilderStart = {
  draft: BuilderDraft;
  /** The signature's name when the drink started from one. */
  signatureName: string | null;
  /** A polite note for the customer, e.g. when a link no longer works. */
  notice: string | null;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveBuilderStart(
  catalog: BuilderCatalog,
  params: SearchParams,
): BuilderStart {
  const empty = { draft: EMPTY_DRAFT, signatureName: null };

  // TODO(Stage 5): load the cart item and start from its drink.
  if (first(params.edit) !== undefined) {
    return {
      ...empty,
      notice:
        "Editing a drink from your cart will be available once the cart opens. You are welcome to build a new drink below.",
    };
  }

  const slug = first(params.from) ?? first(params.drink);
  if (slug === undefined) return { ...empty, notice: null };

  const signature = catalog.signatures.find((s) => s.slug === slug);
  if (!signature) {
    return {
      ...empty,
      notice:
        "We could not find that drink on the menu, so here is an empty cup to start from.",
    };
  }
  return {
    draft: draftFromRecipe(signature.recipe, signature.slug),
    signatureName: signature.name,
    notice: null,
  };
}
