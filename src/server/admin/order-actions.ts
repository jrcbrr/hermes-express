"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { order } from "@/db/schema";
import { canTransition, ORDER_STATUSES } from "@/lib/order-status";
import { requireRole } from "@/server/auth/session";
import { writeOrderTransition } from "@/server/orders/transition";
import type { AdminActionResult } from "./types";

const NOT_FOUND = "We could not find this order.";
const NOT_ALLOWED =
  "This order has moved on. Please refresh to see its latest status.";

const schema = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUSES),
});

/** Moves any branch's order along an allowed transition. */
export async function updateOrderStatus(
  input: unknown,
): Promise<AdminActionResult> {
  const admin = await requireRole(["admin"], "/admin/orders");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: NOT_FOUND };
  const { orderId, to } = parsed.data;

  const [found] = await getDb()
    .select({ status: order.status, fulfillment: order.fulfillment })
    .from(order)
    .where(eq(order.id, orderId));
  if (!found) return { ok: false, message: NOT_FOUND };
  if (!canTransition(found.status, to, found.fulfillment)) {
    return { ok: false, message: NOT_ALLOWED };
  }

  const moved = await writeOrderTransition({
    orderId,
    from: found.status,
    to,
    changedByUserId: admin.id,
  });
  if (!moved) return { ok: false, message: NOT_ALLOWED };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
