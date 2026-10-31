// Reads for /rewards and /profile. Callers pass the signed-in user's id.
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pointsLedger, userBadge } from "@/db/schema";

const HISTORY_LIMIT = 50;

export async function listPointsHistory(userId: string) {
  return getDb()
    .select({
      id: pointsLedger.id,
      delta: pointsLedger.delta,
      reason: pointsLedger.reason,
      note: pointsLedger.note,
      orderId: pointsLedger.orderId,
      createdAt: pointsLedger.createdAt,
    })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(HISTORY_LIMIT);
}

export async function listEarnedBadges(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ badgeKey: userBadge.badgeKey })
    .from(userBadge)
    .where(eq(userBadge.userId, userId));
  return rows.map((row) => row.badgeKey);
}
