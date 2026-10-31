import { describe, expect, it } from "vitest";
import { findNewOrders, groupQueue } from "./order-queue";
import type { OrderStatus } from "./order-status";

const order = (
  id: string,
  status: OrderStatus,
  createdAt: string,
  scheduledFor: string | null = null,
) => ({ id, status, createdAt, scheduledFor });

describe("groupQueue", () => {
  it("keeps every active group, in working order, even when empty", () => {
    expect(groupQueue([]).map((g) => [g.status, g.orders])).toEqual([
      ["received", []],
      ["brewing", []],
      ["ready_for_pickup", []],
      ["out_for_delivery", []],
    ]);
  });

  it("puts each order under its status and leaves out final orders", () => {
    const groups = groupQueue([
      order("a", "brewing", "2026-10-30T01:00:00Z"),
      order("b", "received", "2026-10-30T01:00:00Z"),
      order("c", "out_for_delivery", "2026-10-30T01:00:00Z"),
      order("d", "completed", "2026-10-30T01:00:00Z"),
      order("e", "cancelled", "2026-10-30T01:00:00Z"),
    ]);
    expect(groups.map((g) => g.orders.map((o) => o.id))).toEqual([
      ["b"],
      ["a"],
      [],
      ["c"],
    ]);
  });

  it("sorts soonest due first, using the slot of a scheduled order", () => {
    const [received] = groupQueue([
      order(
        "later",
        "received",
        "2026-10-30T00:00:00Z",
        "2026-10-30T05:00:00Z",
      ),
      order("asap", "received", "2026-10-30T02:00:00Z"),
      order("soon", "received", "2026-10-30T01:00:00Z", "2026-10-30T01:30:00Z"),
    ]);
    expect(received!.orders.map((o) => o.id)).toEqual([
      "soon",
      "asap",
      "later",
    ]);
  });

  it("accepts dates as well as JSON strings", () => {
    const [received] = groupQueue([
      {
        id: "b",
        status: "received" as const,
        createdAt: new Date("2026-10-30T02:00:00Z"),
        scheduledFor: null,
      },
      order("a", "received", "2026-10-30T01:00:00Z"),
    ]);
    expect(received!.orders.map((o) => o.id)).toEqual(["a", "b"]);
  });
});

describe("findNewOrders", () => {
  it("returns only orders not seen before", () => {
    expect(findNewOrders(new Set(["a"]), [{ id: "a" }, { id: "b" }])).toEqual([
      { id: "b" },
    ]);
  });
});
