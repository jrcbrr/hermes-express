"use client";

import { useActionState, useState } from "react";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROLES, type Role } from "@/lib/roles";
import {
  adjustPoints,
  setUserRole,
  updateCustomer,
} from "@/server/admin/customer-actions";
import type { AdminFormState } from "@/server/admin/types";
import { controlClass } from "./admin-ui";

const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  barista: "Barista",
  admin: "Admin",
};

function SaveRow({
  label,
  pending,
  saved,
}: {
  label: string;
  pending: boolean;
  saved: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      <p role="status" className="text-sm text-success">
        {saved && !pending ? saved : ""}
      </p>
    </div>
  );
}

export function CustomerForm({
  userId,
  initial,
}: {
  userId: string;
  initial: { name: string; phone: string; defaultAddress: string };
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    updateCustomer,
    {},
  );
  const values = state.values ?? initial;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage message={state.errors?.form} />
      <FormField
        name="name"
        label="Full name"
        required
        defaultValue={values.name}
        error={state.errors?.name}
      />
      <FormField
        name="phone"
        label="Mobile number"
        type="tel"
        inputMode="tel"
        defaultValue={values.phone}
        error={state.errors?.phone}
      />
      <FormField
        name="defaultAddress"
        label="Default delivery address"
        defaultValue={values.defaultAddress}
        error={state.errors?.defaultAddress}
      />
      <SaveRow
        label="Save profile"
        pending={pending}
        saved={state.status === "saved" ? "The profile has been saved." : null}
      />
    </form>
  );
}

export function RoleForm({
  userId,
  initial,
  branches,
  isSelf,
}: {
  userId: string;
  initial: { role: Role; branchId: string };
  branches: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    setUserRole,
    {},
  );
  const [role, setRole] = useState<string>(state.values?.role ?? initial.role);

  if (isSelf) {
    return (
      <p className="text-sm text-muted-foreground">
        You are signed in as {ROLE_LABELS[initial.role]}. You cannot change your
        own role.
      </p>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage message={state.errors?.form} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-role">Role</Label>
        <select
          id="field-role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className={controlClass}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      {role === "barista" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-branchId">Branch</Label>
          <select
            id="field-branchId"
            name="branchId"
            defaultValue={state.values?.branchId ?? initial.branchId}
            aria-invalid={state.errors?.branchId ? true : undefined}
            className={controlClass}
          >
            <option value="">Choose a branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {state.errors?.branchId ? (
            <p className="text-sm text-danger">{state.errors.branchId}</p>
          ) : null}
        </div>
      ) : null}
      <SaveRow
        label="Save role"
        pending={pending}
        saved={state.status === "saved" ? "The role has been saved." : null}
      />
    </form>
  );
}

export function PointsForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    adjustPoints,
    {},
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormField
        name="delta"
        label="Points to add or remove"
        inputMode="numeric"
        hint="Use a minus sign to remove points, for example -50."
        defaultValue={state.values?.delta ?? ""}
        error={state.errors?.delta}
      />
      <FormField
        name="note"
        label="Reason"
        defaultValue={state.values?.note ?? ""}
        error={state.errors?.note}
      />
      <SaveRow
        label="Adjust points"
        pending={pending}
        saved={
          state.status === "saved" ? "The balance has been updated." : null
        }
      />
    </form>
  );
}
