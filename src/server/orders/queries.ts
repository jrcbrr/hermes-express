// Order reads for Server Components. Every read checks who is asking.
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { branch, order, orderItem } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrderDetails = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      order,
      branchName: branch.name,
      branchAddress: branch.address,
    })
    .from(order)
    .innerJoin(branch, eq(order.branchId, branch.id))
    .where(eq(order.id, orderId));
  if (!row) return null;
  const items = await db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId))
    .orderBy(asc(orderItem.sortOrder));
  return {
    ...row.order,
    branchName: row.branchName,
    branchAddress: row.branchAddress,
    items,
  };
}

/**
 * One order, or null when it doesn't exist or the user may not see it. The
 * customer sees their own orders, a barista their branch's, an admin all.
 * "Not yours" and "doesn't exist" look the same, so ids can't be probed.
 */
export async function getOrderForUser(
  orderId: string,
  user: Pick<SessionUser, "id" | "role" | "branchId">,
): Promise<OrderDetails | null> {
  if (!UUID.test(orderId)) return null;
  const found = await loadOrder(orderId);
  if (!found) return null;
  const allowed =
    found.userId === user.id ||
    hasRole(user.role, ["admin"]) ||
    (hasRole(user.role, ["barista"]) && user.branchId === found.branchId);
  return allowed ? found : null;
}
