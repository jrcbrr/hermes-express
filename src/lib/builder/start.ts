/**
 * Where the builder starts, from the page's query string:
 * - `?from=<slug>` (or the older `?drink=<slug>`): a signature drink's recipe.
 * - `?edit=<cartItemId>`: a drink in the cart to change. The cart lives in
 *   the browser, so the page only passes the id on (see BuilderEntry).
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
  /** The cart item being edited, if any. */
  editId: string | null;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveBuilderStart(
  catalog: BuilderCatalog,
  params: SearchParams,
): BuilderStart {
  const empty = { draft: EMPTY_DRAFT, signatureName: null, editId: null };

  const editId = first(params.edit);
  if (editId !== undefined && editId !== "") {
    return { ...empty, notice: null, editId };
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
    editId: null,
  };
}
