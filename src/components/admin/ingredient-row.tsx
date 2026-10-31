"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogIngredient } from "@/lib/catalog";
import { updateIngredient } from "@/server/admin/ingredient-actions";
import type { AdminFormState } from "@/server/admin/types";

/** One builder option's own small form. Ids carry the slug: many share a page. */
export function IngredientRow({
  ingredient,
}: {
  ingredient: CatalogIngredient;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    updateIngredient,
    {},
  );
  const typed = state.values;
  const id = (field: string) => `${ingredient.slug}-${field}`;
  const error = (field: string) =>
    state.errors?.[field] ? (
      <p className="text-sm text-danger">{state.errors[field]}</p>
    ) : null;

  return (
    <li className="rounded-xl border bg-surface p-3">
      <form action={action} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="id" value={ingredient.id} />
        <FormMessage message={state.errors?.form} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-start">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("name")}>Name</Label>
            <Input
              id={id("name")}
              name="name"
              className="h-11"
              defaultValue={typed?.name ?? ingredient.name}
            />
            {error("name")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={id("price")}
            >{`Price of ${ingredient.name} in pesos`}</Label>
            <Input
              id={id("price")}
              name="price"
              inputMode="decimal"
              className="h-11"
              defaultValue={
                typed?.price ?? String(ingredient.priceCentavos / 100)
              }
            />
            {error("price")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("sortOrder")}>Order</Label>
            <Input
              id={id("sortOrder")}
              name="sortOrder"
              inputMode="numeric"
              className="h-11"
              defaultValue={typed?.sortOrder ?? String(ingredient.sortOrder)}
            />
            {error("sortOrder")}
          </div>
          {ingredient.color !== null ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("color")}>Colour</Label>
              <input
                id={id("color")}
                name="color"
                type="color"
                defaultValue={(typed?.color || ingredient.color).toLowerCase()}
                className="h-11 w-16 rounded-lg border border-input bg-surface p-1"
              />
              {error("color")}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={
                typed ? typed.isActive === "on" : ingredient.isActive
              }
              className="size-4"
            />
            Available in the builder
          </label>
          <Button
            type="submit"
            variant="outline"
            className="h-11 px-4"
            disabled={pending}
            aria-label={`Save ${ingredient.name}`}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <p role="status" className="text-sm text-success">
            {state.status === "saved" && !pending ? "Saved." : ""}
          </p>
        </div>
        {error("isActive")}
      </form>
    </li>
  );
}
