import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { rating } from "@/db/schema";

/** A customer's ratings for these order items. */
export async function listRatings(
  userId: string,
  orderItemIds: readonly string[],
) {
  if (orderItemIds.length === 0) return [];
  return getDb()
    .select({
      orderItemId: rating.orderItemId,
      stars: rating.stars,
      comment: rating.comment,
    })
    .from(rating)
    .where(
      and(
        eq(rating.userId, userId),
        inArray(rating.orderItemId, [...orderItemIds]),
      ),
    );
}
