"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";
import { signUp, type AuthFormState } from "@/server/auth/actions";
import { FormField, FormMessage } from "./form-field";

export function SignUpForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    {},
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage message={state.message} />
      <FormField
        name="name"
        label="Full name"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <FormField
        name="phone"
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0917 123 4567"
        hint="A Philippine mobile number, so the barista or rider can reach you."
        required
        defaultValue={state.values?.phone}
        error={state.errors?.phone}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        required
        error={state.errors?.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
