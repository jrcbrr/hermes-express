/**
 * Order statuses and the changes allowed between them (docs/PLAN.md §7):
 * Received → Brewing → Ready for pickup | Out for delivery → Completed,
 * and Cancelled before the drink leaves the bar. Every status change on the
 * server must pass canTransition().
 */
import type { BranchService } from "@/config/site";

export const ORDER_STATUSES = [
  "received",
  "brewing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Every new order starts here. */
export const INITIAL_ORDER_STATUS: OrderStatus = "received";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  brewing: "Brewing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["brewing", "cancelled"],
  brewing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

/** True when an order may move from `from` to `to`. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: BranchService,
): boolean {
  if (to === "ready_for_pickup" && fulfillment !== "pickup") return false;
  if (to === "out_for_delivery" && fulfillment !== "delivery") return false;
  return NEXT[from].includes(to);
}

/** The statuses an order can move to next. */
export function nextStatuses(
  from: OrderStatus,
  fulfillment: BranchService,
): OrderStatus[] {
  return NEXT[from].filter((to) => canTransition(from, to, fulfillment));
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Orders still being worked on: what the barista queue shows. */
export const ACTIVE_ORDER_STATUSES = [
  "received",
  "brewing",
  "ready_for_pickup",
  "out_for_delivery",
] as const satisfies readonly OrderStatus[];

/** True when nothing can happen to the order any more. */
export function isFinalStatus(status: OrderStatus): boolean {
  return NEXT[status].length === 0;
}

/** The one forward move (the barista's main button). Never Cancelled. */
export function advanceStatus(
  from: OrderStatus,
  fulfillment: BranchService,
): OrderStatus | null {
  return nextStatuses(from, fulfillment).find((s) => s !== "cancelled") ?? null;
}

/** The path a customer's tracker shows, from Received to Completed. */
export function trackerSteps(fulfillment: BranchService): OrderStatus[] {
  return [
    "received",
    "brewing",
    fulfillment === "pickup" ? "ready_for_pickup" : "out_for_delivery",
    "completed",
  ];
}

/** Where the order is on its tracker path. -1 when it isn't on it (Cancelled). */
export function trackerStepIndex(
  status: OrderStatus,
  fulfillment: BranchService,
): number {
  return trackerSteps(fulfillment).indexOf(status);
}
