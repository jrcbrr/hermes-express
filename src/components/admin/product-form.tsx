"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ProductType } from "@/lib/catalog";
import { SWEETNESS_LEVELS } from "@/lib/validation/drink";
import { createProduct, updateProduct } from "@/server/admin/menu-actions";
import type { AdminFormState } from "@/server/admin/types";
import { controlClass } from "./admin-ui";

export type RecipeOption = { slug: string; name: string };

export type RecipeOptions = {
  sizes: RecipeOption[];
  temperatures: RecipeOption[];
  bases: RecipeOption[];
  milks: RecipeOption[];
  syrups: RecipeOption[];
  toppings: RecipeOption[];
};

export type ProductFormValues = {
  id?: string;
  type: ProductType;
  name: string;
  description: string;
  /** In pesos, as typed. */
  price: string;
  isSeasonal: boolean;
  availableFrom: string;
  availableTo: string;
  isActive: boolean;
  recipeSize: string;
  recipeTemperature: string;
  recipeBase: string;
  recipeMilk: string;
  recipeSweetness: string;
  recipeSyrups: string[];
  recipeToppings: string[];
};

const TYPE_LABELS: Record<ProductType, string> = {
  signature: "Signature drink",
  pastry: "Pastry",
  snack: "Snack",
};

function RecipeSelect({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: RecipeOption[];
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`field-${name}`}>{label}</Label>
      <select
        id={`field-${name}`}
        name={name}
        defaultValue={value}
        className={controlClass}
      >
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RecipeChecks({
  name,
  legend,
  options,
  selected,
}: {
  name: string;
  legend: string;
  options: RecipeOption[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.slug} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={o.slug}
              defaultChecked={selected.includes(o.slug)}
              className="size-4"
            />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Creates a product (no id) or edits one. Type is fixed once created. */
export function ProductForm({
  initial,
  recipeOptions,
}: {
  initial: ProductFormValues;
  recipeOptions: RecipeOptions;
}) {
  const isNew = initial.id === undefined;
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    isNew ? createProduct : updateProduct,
    {},
  );
  const typed = state.values;
  const text = (key: Exclude<keyof ProductFormValues, "id">) =>
    typed?.[key] ?? String(initial[key]);
  const flag = (key: "isSeasonal" | "isActive") =>
    typed ? typed[key] === "on" : initial[key];
  const list = (key: "recipeSyrups" | "recipeToppings") =>
    typed ? (typed[key] ?? "").split(",").filter(Boolean) : initial[key];

  const [type, setType] = useState<string>(typed?.type ?? initial.type);
  const [seasonal, setSeasonal] = useState(flag("isSeasonal"));

  return (
    <form action={action} noValidate className="mt-6 flex flex-col gap-5">
      <FormMessage message={state.errors?.form} />
      {isNew ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-type">Type</Label>
          <select
            id="field-type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={controlClass}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {state.errors?.type ? (
            <p className="text-sm text-danger">{state.errors.type}</p>
          ) : null}
        </div>
      ) : (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <p className="text-sm text-muted-foreground">
            {TYPE_LABELS[initial.type]}
          </p>
        </>
      )}

      <FormField
        name="name"
        label="Name"
        required
        defaultValue={text("name")}
        error={state.errors?.name}
      />
      <FormField
        name="description"
        label="Description"
        defaultValue={text("description")}
        error={state.errors?.description}
      />
      <FormField
        name="price"
        label="Price in pesos"
        inputMode="decimal"
        required
        defaultValue={text("price")}
        error={state.errors?.price}
      />

      {type === "signature" ? (
        <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
          <legend className="px-1 font-semibold">Recipe</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <RecipeSelect
              name="recipeSize"
              label="Size"
              options={recipeOptions.sizes}
              value={text("recipeSize")}
            />
            <RecipeSelect
              name="recipeTemperature"
              label="Temperature"
              options={recipeOptions.temperatures}
              value={text("recipeTemperature")}
            />
            <RecipeSelect
              name="recipeBase"
              label="Base"
              options={recipeOptions.bases}
              value={text("recipeBase")}
            />
            <RecipeSelect
              name="recipeMilk"
              label="Milk"
              options={recipeOptions.milks}
              value={text("recipeMilk")}
            />
            <RecipeSelect
              name="recipeSweetness"
              label="Sweetness"
              options={SWEETNESS_LEVELS.map((level) => ({
                slug: String(level),
                name: `${level}%`,
              }))}
              value={text("recipeSweetness")}
            />
          </div>
          <RecipeChecks
            name="recipeSyrups"
            legend="Syrups"
            options={recipeOptions.syrups}
            selected={list("recipeSyrups")}
          />
          <RecipeChecks
            name="recipeToppings"
            legend="Toppings"
            options={recipeOptions.toppings}
            selected={list("recipeToppings")}
          />
          <p className="text-sm text-muted-foreground">
            The menu price above is what customers pay for this recipe. It is
            not worked out from the ingredients.
          </p>
          <FormMessage message={state.errors?.recipe} />
        </fieldset>
      ) : null}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isSeasonal"
          checked={seasonal}
          onChange={(event) => setSeasonal(event.target.checked)}
          className="size-4"
        />
        Seasonal item
      </label>
      {seasonal ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="availableFrom"
            label="First day available"
            type="date"
            defaultValue={text("availableFrom")}
            error={state.errors?.availableFrom}
          />
          <FormField
            name="availableTo"
            label="Last day available"
            type="date"
            defaultValue={text("availableTo")}
            error={state.errors?.availableTo}
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={flag("isActive")}
          className="size-4"
        />
        Show on the menu
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 px-6"
          disabled={pending}
        >
          {pending ? "Saving…" : isNew ? "Create item" : "Save changes"}
        </Button>
        <p role="status" className="text-sm text-success">
          {state.status === "saved" && !pending
            ? "Your changes are saved."
            : ""}
        </p>
      </div>
    </form>
  );
}
