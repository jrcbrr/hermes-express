"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { branch, user } from "@/db/schema";
import { toFieldErrors } from "@/lib/validation/auth";
import {
  customerFormSchema,
  pointsFormSchema,
  roleFormSchema,
} from "@/lib/validation/admin";
import { requireRole } from "@/server/auth/session";
import { formString } from "@/server/auth/request";
import { recordPointsAdjustment } from "@/server/points/ledger";
import type { AdminFormState } from "./types";

const NOT_FOUND = "We could not find this account.";
const PATH = "/admin/customers";

/** Edits a customer's name, phone and address. Email stays read-only. */
export async function updateCustomer(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], PATH);
  const values = {
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    defaultAddress: formString(formData, "defaultAddress"),
  };
  const parsed = customerFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  const updated = await getDb()
    .update(user)
    .set(parsed.data)
    .where(eq(user.id, formString(formData, "userId")))
    .returning({ id: user.id });
  if (updated.length === 0) return { errors: { form: NOT_FOUND }, values };

  revalidatePath("/", "layout");
  return { status: "saved" };
}

/**
 * Changes an account's role and, for baristas, their branch. Admins can't
 * change their own role, so the last admin can never lock everyone out. The
 * session reads the role from the database, so this applies on the next request.
 */
export async function setUserRole(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireRole(["admin"], PATH);
  const userId = formString(formData, "userId");
  const values = {
    role: formString(formData, "role"),
    branchId: formString(formData, "branchId"),
  };
  if (userId === admin.id) {
    return {
      errors: { form: "You cannot change your own role." },
      values,
    };
  }
  const parsed = roleFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }
  const { role, branchId } = parsed.data;

  const db = getDb();
  if (role === "barista") {
    const [found] = await db
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.id, branchId));
    if (!found) {
      return {
        errors: { branchId: "Please choose the barista's branch." },
        values,
      };
    }
  }

  const updated = await db
    .update(user)
    .set({ role, branchId: role === "barista" ? branchId : null })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  if (updated.length === 0) return { errors: { form: NOT_FOUND }, values };

  revalidatePath(PATH, "layout");
  return { status: "saved" };
}

/** Adds to or takes from a balance, which can never go below zero. */
export async function adjustPoints(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireRole(["admin"], PATH);
  const userId = formString(formData, "userId");
  const values = {
    delta: formString(formData, "delta"),
    note: formString(formData, "note"),
  };
  const parsed = pointsFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }
  const { delta, note } = parsed.data;

  // The check is part of the update, so two adjustments at once stay correct.
  const updated = await getDb()
    .update(user)
    .set({ pointsBalance: sql`${user.pointsBalance} + ${delta}::int` })
    .where(
      and(eq(user.id, userId), sql`${user.pointsBalance} + ${delta}::int >= 0`),
    )
    .returning({ id: user.id });
  if (updated.length === 0) {
    return {
      errors: { delta: "This would take the balance below zero." },
      values,
    };
  }

  await recordPointsAdjustment({ userId, delta, note, adminId: admin.id });
  revalidatePath(PATH, "layout");
  return { status: "saved" };
}
