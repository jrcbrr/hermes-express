"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createPromo, updatePromo } from "@/server/admin/promo-actions";
import type { AdminFormState } from "@/server/admin/types";
import { controlClass } from "./admin-ui";

export type PromoFormValues = {
  id?: string;
  code: string;
  type: "percent" | "fixed";
  /** A percent, or pesos, as typed. */
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  firstOrderOnly: boolean;
  startsAt: string;
  endsAt: string;
  maxUses: string;
  isActive: boolean;
};

/** Creates a code (no id) or edits one. The code's text is fixed once created. */
export function PromoForm({ initial }: { initial: PromoFormValues }) {
  const isNew = initial.id === undefined;
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    isNew ? createPromo : updatePromo,
    {},
  );
  const typed = state.values;
  const text = (
    key:
      | "value"
      | "maxDiscount"
      | "minSubtotal"
      | "startsAt"
      | "endsAt"
      | "maxUses"
      | "code",
  ) => typed?.[key] ?? initial[key];
  const flag = (key: "firstOrderOnly" | "isActive") =>
    typed ? typed[key] === "on" : initial[key];
  const [type, setType] = useState<string>(typed?.type ?? initial.type);

  return (
    <form action={action} noValidate className="mt-6 flex flex-col gap-5">
      <FormMessage message={state.errors?.form} />
      {isNew ? (
        <FormField
          name="code"
          label="Code"
          required
          autoCapitalize="characters"
          autoComplete="off"
          hint="3 to 20 letters and numbers. It cannot be changed later."
          defaultValue={text("code")}
          error={state.errors?.code}
        />
      ) : (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-type">Type</Label>
        <select
          id="field-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={controlClass}
        >
          <option value="percent">Percent off</option>
          <option value="fixed">Amount off</option>
        </select>
      </div>
      <FormField
        name="value"
        label={type === "percent" ? "Percent off" : "Amount off in pesos"}
        inputMode="decimal"
        required
        defaultValue={text("value")}
        error={state.errors?.value}
      />
      <FormField
        name="maxDiscount"
        label="Maximum discount in pesos (optional)"
        inputMode="decimal"
        defaultValue={text("maxDiscount")}
        error={state.errors?.maxDiscount}
      />
      <FormField
        name="minSubtotal"
        label="Minimum order in pesos (optional)"
        inputMode="decimal"
        defaultValue={text("minSubtotal")}
        error={state.errors?.minSubtotal}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="startsAt"
          label="First day (optional)"
          type="date"
          defaultValue={text("startsAt")}
          error={state.errors?.startsAt}
        />
        <FormField
          name="endsAt"
          label="Last day (optional)"
          type="date"
          defaultValue={text("endsAt")}
          error={state.errors?.endsAt}
        />
      </div>
      <FormField
        name="maxUses"
        label="Maximum uses (optional)"
        inputMode="numeric"
        hint="Leave empty for unlimited."
        defaultValue={text("maxUses")}
        error={state.errors?.maxUses}
      />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="firstOrderOnly"
          defaultChecked={flag("firstOrderOnly")}
          className="size-4"
        />
        First order only
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={flag("isActive")}
          className="size-4"
        />
        Customers can use this code
      </label>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 px-6"
          disabled={pending}
        >
          {pending ? "Saving…" : isNew ? "Create code" : "Save changes"}
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
