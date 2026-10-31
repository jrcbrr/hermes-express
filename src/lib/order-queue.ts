/**
 * Shapes the barista queue (docs/PLAN.md §8). Pure functions only, so the
 * server and the polling board in the browser share them.
 */
import { ACTIVE_ORDER_STATUSES, type OrderStatus } from "./order-status";

type QueueOrder = {
  id: string;
  status: OrderStatus;
  scheduledFor: Date | string | null;
  createdAt: Date | string;
};

export type QueueGroup<T> = {
  status: (typeof ACTIVE_ORDER_STATUSES)[number];
  orders: T[];
};

/** When the order should be ready: its slot, or (ASAP) when it was placed. */
function dueTime(order: QueueOrder): number {
  return new Date(order.scheduledFor ?? order.createdAt).getTime();
}

/**
 * One group per active status, in working order, soonest due first. Empty
 * groups stay so the board keeps its shape; final orders are left out.
 */
export function groupQueue<T extends QueueOrder>(orders: T[]): QueueGroup<T>[] {
  return ACTIVE_ORDER_STATUSES.map((status) => ({
    status,
    orders: orders
      .filter((o) => o.status === status)
      .sort((a, b) => dueTime(a) - dueTime(b)),
  }));
}

/** The orders that were not on the board at the last look. */
export function findNewOrders<T extends { id: string }>(
  knownIds: ReadonlySet<string>,
  orders: T[],
): T[] {
  return orders.filter((o) => !knownIds.has(o.id));
}
