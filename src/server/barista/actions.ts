"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { branchStock, ingredient, order, product } from "@/db/schema";
import { canTransition, ORDER_STATUSES } from "@/lib/order-status";
import { canManageBranch } from "@/lib/roles";
import { requireRole } from "@/server/auth/session";
import { CATALOG_CACHE_TAG } from "@/server/catalog/queries";
import { writeOrderTransition } from "@/server/orders/transition";

export type BaristaActionResult = { ok: true } | { ok: false; message: string };

const STAFF = ["barista", "admin"] as const;
const NOT_FOUND = "We could not find this order.";
const ALREADY_MOVED =
  "This order was just updated. The queue will show its latest status.";

const advanceSchema = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUSES),
});

/**
 * Moves an order to its next status and records who did it. Only staff of the
 * order's branch (or an admin) may, and only along allowed transitions. Another
 * branch's order looks like a missing one, so ids can't be probed.
 */
export async function advanceOrder(
  input: unknown,
): Promise<BaristaActionResult> {
  const user = await requireRole(STAFF, "/barista");
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: NOT_FOUND };
  const { orderId, to } = parsed.data;

  const db = getDb();
  const [found] = await db
    .select({
      branchId: order.branchId,
      status: order.status,
      fulfillment: order.fulfillment,
    })
    .from(order)
    .where(eq(order.id, orderId));
  if (!found || !canManageBranch(user, found.branchId)) {
    return { ok: false, message: NOT_FOUND };
  }
  if (!canTransition(found.status, to, found.fulfillment)) {
    return { ok: false, message: ALREADY_MOVED };
  }

  const moved = await writeOrderTransition({
    orderId,
    from: found.status,
    to,
    changedByUserId: user.id,
  });
  return moved ? { ok: true } : { ok: false, message: ALREADY_MOVED };
}

const soldOutSchema = z.object({
  branchId: z.string().min(1),
  kind: z.enum(["ingredient", "product"]),
  itemId: z.string().min(1),
  soldOut: z.boolean(),
});

/** Marks an ingredient or product sold out (or back in stock) at one branch. */
export async function setSoldOut(input: unknown): Promise<BaristaActionResult> {
  const user = await requireRole(STAFF, "/barista/stock");
  const parsed = soldOutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "We could not update this item." };
  }
  const { branchId, kind, itemId, soldOut } = parsed.data;
  if (!canManageBranch(user, branchId)) {
    return { ok: false, message: "This item belongs to another branch." };
  }

  const db = getDb();
  const table = kind === "ingredient" ? ingredient : product;
  const [item] = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, itemId));
  if (!item) return { ok: false, message: "We could not find this item." };

  const isIngredient = kind === "ingredient";
  await db
    .insert(branchStock)
    .values({
      id: randomUUID(),
      branchId,
      ingredientId: isIngredient ? itemId : null,
      productId: isIngredient ? null : itemId,
      isSoldOut: soldOut,
    })
    .onConflictDoUpdate({
      target: [
        branchStock.branchId,
        isIngredient ? branchStock.ingredientId : branchStock.productId,
      ],
      set: { isSoldOut: soldOut },
    });
  // The menu, builder and checkout read a cached catalog. Clear it now so
  // customers see this at once, and a sold-out item can't be ordered.
  updateTag(CATALOG_CACHE_TAG);
  return { ok: true };
}
