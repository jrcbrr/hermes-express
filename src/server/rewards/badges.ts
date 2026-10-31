// Updates a customer's stats and badges after an order.
import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { order, userBadge, userStat } from "@/db/schema";
import {
  badgesForOrder,
  EMPTY_STATS,
  statsAfterOrder,
  type UserStats,
} from "@/lib/badges";
import type { CatalogSnapshot } from "@/lib/catalog";
import type { OrderLine } from "@/lib/orders";

/**
 * Counts an order that has just been placed. Badges are a bonus: a failure here
 * is logged and never affects the order.
 */
export async function recordOrderBadges(
  userId: string,
  lines: readonly OrderLine[],
  snapshot: CatalogSnapshot,
  now: Date,
): Promise<void> {
  try {
    const db = getDb();
    const [row] = await db
      .select({
        customDrinksBuilt: userStat.customDrinksBuilt,
        basesTried: userStat.basesTried,
        milksTried: userStat.milksTried,
      })
      .from(userStat)
      .where(eq(userStat.userId, userId));
    const stats: UserStats = statsAfterOrder(
      row ?? EMPTY_STATS,
      lines,
      snapshot,
    );
    await db
      .insert(userStat)
      .values({ userId, ...stats })
      .onConflictDoUpdate({ target: userStat.userId, set: stats });

    const [orders] = await db
      .select({ value: count() })
      .from(order)
      .where(and(eq(order.userId, userId), ne(order.status, "cancelled")));
    const earned = badgesForOrder({
      stats,
      orderCount: orders?.value ?? 0,
      lines,
      snapshot,
      now,
    });
    if (earned.length > 0) {
      await db
        .insert(userBadge)
        .values(earned.map((badgeKey) => ({ userId, badgeKey })))
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("Could not update badges:", error);
  }
}

/** Badges the customer hasn't been told about yet. */
export async function listUnseenBadges(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ badgeKey: userBadge.badgeKey })
    .from(userBadge)
    .where(and(eq(userBadge.userId, userId), isNull(userBadge.seenAt)));
  return rows.map((row) => row.badgeKey);
}

export async function markBadgesSeenFor(
  userId: string,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  await getDb()
    .update(userBadge)
    .set({ seenAt: new Date() })
    .where(
      and(eq(userBadge.userId, userId), inArray(userBadge.badgeKey, [...keys])),
    );
}
