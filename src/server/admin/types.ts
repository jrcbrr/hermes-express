import type { FieldErrors } from "@/lib/validation/auth";

/** What the admin area's forms get back from their server action. */
export type AdminFormState = {
  status?: "saved";
  errors?: FieldErrors;
  /** What was typed, so a failed save doesn't clear the form. */
  values?: Record<string, string>;
};

export type AdminActionResult = { ok: true } | { ok: false; message: string };
