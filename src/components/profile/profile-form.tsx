"use client";

import { useActionState } from "react";
import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { updateProfile, type ProfileFormState } from "@/server/profile/actions";

export type ProfileValues = {
  name: string;
  phone: string;
  defaultAddress: string;
};

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {},
  );
  // After an error, show what the user typed; otherwise the saved values.
  const values = state.values ?? initial;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormField
        name="name"
        label="Full name"
        autoComplete="name"
        required
        defaultValue={values.name}
        error={state.errors?.name}
      />
      <FormField
        name="phone"
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0917 123 4567"
        required
        defaultValue={values.phone}
        error={state.errors?.phone}
      />
      <FormField
        name="defaultAddress"
        label="Default delivery address"
        autoComplete="street-address"
        hint="Optional. We deliver within Taguig and BGC."
        defaultValue={values.defaultAddress}
        error={state.errors?.defaultAddress}
      />
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 px-6"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p role="status" className="text-sm text-success">
          {state.status === "saved" && !pending
            ? "Your profile has been saved."
            : ""}
        </p>
      </div>
    </form>
  );
}
