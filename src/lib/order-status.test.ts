import { describe, expect, it } from "vitest";
import {
  canTransition,
  INITIAL_ORDER_STATUS,
  isOrderStatus,
  nextStatuses,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
} from "./order-status";

describe("order statuses", () => {
  it("starts every order as Received", () => {
    expect(INITIAL_ORDER_STATUS).toBe("received");
  });

  it("has a label for every status", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("recognises status strings", () => {
    expect(isOrderStatus("brewing")).toBe(true);
    expect(isOrderStatus("lost")).toBe(false);
  });
});

describe("canTransition", () => {
  it("follows the pickup path", () => {
    expect(canTransition("received", "brewing", "pickup")).toBe(true);
    expect(canTransition("brewing", "ready_for_pickup", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "completed", "pickup")).toBe(true);
  });

  it("follows the delivery path", () => {
    expect(canTransition("brewing", "out_for_delivery", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "completed", "delivery")).toBe(
      true,
    );
  });

  it("keeps pickup and delivery steps apart", () => {
    expect(canTransition("brewing", "out_for_delivery", "pickup")).toBe(false);
    expect(canTransition("brewing", "ready_for_pickup", "delivery")).toBe(
      false,
    );
  });

  it("rejects skipping steps, going back, and leaving a final status", () => {
    expect(canTransition("received", "completed", "pickup")).toBe(false);
    expect(canTransition("brewing", "received", "pickup")).toBe(false);
    expect(canTransition("completed", "cancelled", "pickup")).toBe(false);
    expect(canTransition("cancelled", "brewing", "pickup")).toBe(false);
  });

  it("allows cancelling only before the drink is ready", () => {
    expect(canTransition("received", "cancelled", "delivery")).toBe(true);
    expect(canTransition("brewing", "cancelled", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "cancelled", "delivery")).toBe(
      false,
    );
  });
});

describe("nextStatuses", () => {
  it("lists only the moves that suit the fulfillment", () => {
    expect(nextStatuses("brewing", "pickup")).toEqual([
      "ready_for_pickup",
      "cancelled",
    ]);
    expect(nextStatuses("brewing", "delivery")).toEqual([
      "out_for_delivery",
      "cancelled",
    ]);
    expect(nextStatuses("completed", "pickup")).toEqual([]);
  });
});
