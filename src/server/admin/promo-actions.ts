"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { promoCode } from "@/db/schema";
import { manilaDayRange } from "@/lib/admin";
import { toFieldErrors } from "@/lib/validation/auth";
import { promoCodeSchema, promoFormSchema } from "@/lib/validation/promo";
import { requireRole } from "@/server/auth/session";
import { formString } from "@/server/auth/request";
import type { AdminActionResult, AdminFormState } from "./types";

const PATH = "/admin/promos";

function typedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of [
    "type",
    "value",
    "maxDiscount",
    "minSubtotal",
    "firstOrderOnly",
    "startsAt",
    "endsAt",
    "maxUses",
    "isActive",
  ]) {
    values[key] = formString(formData, key);
  }
  return values;
}

/** The form's fields as stored. Dates are whole Manila days. */
function columns(data: z.output<typeof promoFormSchema>) {
  return {
    type: data.type,
    value: data.value,
    maxDiscountCentavos: data.maxDiscount,
    minSubtotalCentavos: data.minSubtotal ?? 0,
    firstOrderOnly: data.firstOrderOnly,
    startsAt: manilaDayRange(data.startsAt)?.start ?? null,
    endsAt: manilaDayRange(data.endsAt)?.end ?? null,
    maxUses: data.maxUses,
    isActive: data.isActive,
  };
}

export async function createPromo(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], `${PATH}/new`);
  const values = {
    ...typedValues(formData),
    code: formString(formData, "code"),
  };
  const code = promoCodeSchema.safeParse(values.code);
  const parsed = promoFormSchema.safeParse(values);
  if (!code.success || !parsed.success) {
    return {
      errors: {
        ...(code.success ? {} : { code: code.error.issues[0]?.message }),
        ...(parsed.success ? {} : toFieldErrors(parsed.error)),
      },
      values,
    };
  }

  const inserted = await getDb()
    .insert(promoCode)
    .values({ id: randomUUID(), code: code.data, ...columns(parsed.data) })
    .onConflictDoNothing()
    .returning({ id: promoCode.id });
  if (inserted.length === 0) {
    return { errors: { code: "This code already exists." }, values };
  }

  revalidatePath(PATH, "layout");
  redirect(PATH);
}

/** Saves a code's settings. Its text and used count never change here. */
export async function updatePromo(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireRole(["admin"], PATH);
  const id = formString(formData, "id");
  const values = typedValues(formData);
  const parsed = promoFormSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  const db = getDb();
  const [found] = await db
    .select({ usedCount: promoCode.usedCount })
    .from(promoCode)
    .where(eq(promoCode.id, id));
  if (!found) {
    return { errors: { form: "We could not find this code." }, values };
  }
  if (parsed.data.maxUses !== null && parsed.data.maxUses < found.usedCount) {
    return {
      errors: {
        maxUses: `This code has already been used ${found.usedCount} times.`,
      },
      values,
    };
  }

  await db
    .update(promoCode)
    .set(columns(parsed.data))
    .where(eq(promoCode.id, id));
  revalidatePath(PATH, "layout");
  return { status: "saved" };
}

const activeSchema = z.object({ id: z.string().min(1), active: z.boolean() });

/** Switches a code on or off. Past orders keep their discount either way. */
export async function setPromoActive(
  input: unknown,
): Promise<AdminActionResult> {
  await requireRole(["admin"], PATH);
  const parsed = activeSchema.safeParse(input);
  const notFound = {
    ok: false,
    message: "We could not find this code.",
  } as const;
  if (!parsed.success) return notFound;

  const updated = await getDb()
    .update(promoCode)
    .set({ isActive: parsed.data.active })
    .where(eq(promoCode.id, parsed.data.id))
    .returning({ id: promoCode.id });
  if (updated.length === 0) return notFound;

  revalidatePath(PATH, "layout");
  return { ok: true };
}
