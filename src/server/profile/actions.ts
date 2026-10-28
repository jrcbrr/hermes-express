"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import {
  profileSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";
import { requireUser } from "@/server/auth/session";
import { formString } from "@/server/auth/request";

export type ProfileFormState = {
  status?: "saved";
  errors?: FieldErrors;
  values?: Record<string, string>;
};

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  // Always the signed-in user's own row: the id never comes from the form.
  const current = await requireUser("/profile");

  const values = {
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    defaultAddress: formString(formData, "defaultAddress"),
  };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  await getDb().update(user).set(parsed.data).where(eq(user.id, current.id));
  revalidatePath("/", "layout");
  return { status: "saved" };
}
