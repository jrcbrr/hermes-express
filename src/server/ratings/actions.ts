"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { order, orderItem, rating } from "@/db/schema";
import { requireUser } from "@/server/auth/session";

export type RatingResult = { ok: true } | { ok: false; message: string };

const NOT_FOUND = "We could not find this item.";

const schema = z.object({
  orderItemId: z.uuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300),
});

/** Rates one item the customer ordered, once, after the order is Completed. */
export async function rateItem(input: unknown): Promise<RatingResult> {
  const user = await requireUser("/orders");
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please choose 1 to 5 stars." };
  }
  const { orderItemId, stars, comment } = parsed.data;

  const db = getDb();
  const [found] = await db
    .select({ orderId: order.id, userId: order.userId, status: order.status })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .where(eq(orderItem.id, orderItemId));
  // Someone else's order looks like a missing one, so ids can't be probed.
  if (!found || found.userId !== user.id) {
    return { ok: false, message: NOT_FOUND };
  }
  if (found.status !== "completed") {
    return { ok: false, message: "You can rate this once it is completed." };
  }

  const inserted = await db
    .insert(rating)
    .values({
      id: randomUUID(),
      orderItemId,
      userId: user.id,
      stars,
      comment,
    })
    .onConflictDoNothing()
    .returning({ id: rating.id });
  if (inserted.length === 0) {
    return { ok: false, message: "You have already rated this item." };
  }
  revalidatePath(`/orders/${found.orderId}`);
  return { ok: true };
}
