import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { IngredientRow } from "@/components/admin/ingredient-row";
import { INGREDIENT_KINDS, type IngredientKind } from "@/lib/catalog";
import { requireRole } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Admin ingredients" };

const HEADINGS: Record<IngredientKind, string> = {
  size: "Sizes",
  temperature: "Temperatures",
  base: "Bases",
  milk: "Milks",
  syrup: "Syrups",
  topping: "Toppings",
  shot: "Extra shot",
};

async function IngredientsContent() {
  await requireRole(["admin"], "/admin/ingredients");
  const { ingredients } = await getCatalogSnapshot();
  return INGREDIENT_KINDS.map((kind) => (
    <section key={kind} aria-label={HEADINGS[kind]} className="mt-8">
      <h2 className="font-heading text-xl font-extrabold">{HEADINGS[kind]}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {ingredients
          .filter((i) => i.kind === kind)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => (
            <IngredientRow key={i.id} ingredient={i} />
          ))}
      </ul>
    </section>
  ));
}

export default function AdminIngredientsPage() {
  return (
    <>
      <AdminHeading title="Ingredients" />
      <p className="mt-2 text-sm text-muted-foreground">
        These prices apply to drinks built in the builder. Signature drinks keep
        the menu price set under Menu.
      </p>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading ingredients…
          </p>
        }
      >
        <IngredientsContent />
      </Suspense>
    </>
  );
}
