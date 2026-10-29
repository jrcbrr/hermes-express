// Order reads for Server Components. Every read checks who is asking.
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { branch, order, orderItem, promoCode } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrderDetails = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function loadOrder(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      order,
      branchSlug: branch.slug,
      branchName: branch.name,
      branchAddress: branch.address,
      promoCode: promoCode.code,
    })
    .from(order)
    .innerJoin(branch, eq(order.branchId, branch.id))
    .leftJoin(promoCode, eq(order.promoCodeId, promoCode.id))
    .where(eq(order.id, orderId));
  if (!row) return null;
  const items = await db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId))
    .orderBy(asc(orderItem.sortOrder));
  return {
    ...row.order,
    branchSlug: row.branchSlug,
    branchName: row.branchName,
    branchAddress: row.branchAddress,
    promoCode: row.promoCode,
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

export type ReceiptSummary = Awaited<
  ReturnType<typeof listReceiptsForUser>
>[number];

/** The user's own receipts, newest first: one per order they placed. */
export async function listReceiptsForUser(userId: string) {
  return getDb()
    .select({
      id: order.id,
      receiptNumber: order.receiptNumber,
      branchSlug: branch.slug,
      branchName: branch.name,
      fulfillment: order.fulfillment,
      totalCentavos: order.totalCentavos,
      createdAt: order.createdAt,
    })
    .from(order)
    .innerJoin(branch, eq(order.branchId, branch.id))
    .where(eq(order.userId, userId))
    .orderBy(desc(order.createdAt), desc(order.receiptNumber));
}
