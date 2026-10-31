// Order reads for Server Components. Every read checks who is asking.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { BranchService } from "@/config/site";
import { getDb } from "@/db";
import {
  branch,
  order,
  orderItem,
  orderStatusEvent,
  promoCode,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { ACTIVE_ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
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

export type OrderTracking = {
  status: OrderStatus;
  fulfillment: BranchService;
  events: { status: OrderStatus; at: string }[];
};

/** The tracker's data for an order the caller has already been allowed to see. */
export async function trackingForOrder(
  found: Pick<OrderDetails, "id" | "status" | "fulfillment">,
): Promise<OrderTracking> {
  const events = await getDb()
    .select({
      status: orderStatusEvent.status,
      createdAt: orderStatusEvent.createdAt,
    })
    .from(orderStatusEvent)
    .where(eq(orderStatusEvent.orderId, found.id))
    .orderBy(asc(orderStatusEvent.createdAt));
  return {
    status: found.status,
    fulfillment: found.fulfillment,
    events: events.map((e) => ({
      status: e.status,
      at: e.createdAt.toISOString(),
    })),
  };
}

/** What the tracker polls for. Same access rule as getOrderForUser. */
export async function getOrderTracking(
  orderId: string,
  user: Pick<SessionUser, "id" | "role" | "branchId">,
): Promise<OrderTracking | null> {
  const found = await getOrderForUser(orderId, user);
  return found ? trackingForOrder(found) : null;
}

/** An order on the barista's board. Dates are strings: it also travels as JSON. */
export type QueueOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  fulfillment: BranchService;
  scheduledFor: string | null;
  createdAt: string;
  contactName: string;
  phone: string;
  address: string | null;
  notes: string;
  items: { id: string; name: string; quantity: number; details: string[] }[];
};

/**
 * A branch's active orders. Callers must have checked the user may see this
 * branch (see resolveStaffBranch).
 */
export async function listBranchQueue(branchId: string): Promise<QueueOrder[]> {
  const db = getDb();
  const orders = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.branchId, branchId),
        inArray(order.status, [...ACTIVE_ORDER_STATUSES]),
      ),
    )
    .orderBy(asc(order.createdAt));
  if (orders.length === 0) return [];
  const items = await db
    .select()
    .from(orderItem)
    .where(
      inArray(
        orderItem.orderId,
        orders.map((o) => o.id),
      ),
    )
    .orderBy(asc(orderItem.sortOrder));
  return orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    fulfillment: o.fulfillment,
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    contactName: o.contactName,
    phone: o.phone,
    address: o.address,
    notes: o.notes,
    items: items
      .filter((item) => item.orderId === o.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        details: item.config.details,
      })),
  }));
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
