import { describe, expect, it } from "vitest";
import {
  ACTIVE_ORDER_STATUSES,
  advanceStatus,
  canTransition,
  INITIAL_ORDER_STATUS,
  isFinalStatus,
  isOrderStatus,
  nextStatuses,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  trackerStepIndex,
  trackerSteps,
  type OrderStatus,
} from "./order-status";

describe("every possible transition", () => {
  const allowed: Record<"pickup" | "delivery", string[]> = {
    pickup: [
      "received>brewing",
      "received>cancelled",
      "brewing>ready_for_pickup",
      "brewing>cancelled",
      "ready_for_pickup>completed",
      "out_for_delivery>completed",
    ],
    delivery: [
      "received>brewing",
      "received>cancelled",
      "brewing>out_for_delivery",
      "brewing>cancelled",
      "ready_for_pickup>completed",
      "out_for_delivery>completed",
    ],
  };

  for (const fulfillment of ["pickup", "delivery"] as const) {
    it(`allows exactly the listed moves for ${fulfillment}`, () => {
      const moves = ORDER_STATUSES.flatMap((from) =>
        ORDER_STATUSES.filter((to) => canTransition(from, to, fulfillment)).map(
          (to) => `${from}>${to}`,
        ),
      );
      expect(moves.sort()).toEqual([...allowed[fulfillment]].sort());
    });
  }
});

describe("advanceStatus", () => {
  it("walks the pickup path to the end", () => {
    const path: (OrderStatus | null)[] = ["received"];
    while (path.at(-1)) path.push(advanceStatus(path.at(-1)!, "pickup"));
    expect(path).toEqual([
      "received",
      "brewing",
      "ready_for_pickup",
      "completed",
      null,
    ]);
  });

  it("walks the delivery path to the end", () => {
    expect(advanceStatus("brewing", "delivery")).toBe("out_for_delivery");
    expect(advanceStatus("out_for_delivery", "delivery")).toBe("completed");
  });

  it("never offers Cancelled and has nothing after a final status", () => {
    for (const status of ORDER_STATUSES) {
      expect(advanceStatus(status, "pickup")).not.toBe("cancelled");
    }
    expect(advanceStatus("cancelled", "pickup")).toBeNull();
  });
});

describe("isFinalStatus and ACTIVE_ORDER_STATUSES", () => {
  it("splits every status into active or final", () => {
    for (const status of ORDER_STATUSES) {
      expect(isFinalStatus(status)).toBe(
        !(ACTIVE_ORDER_STATUSES as readonly OrderStatus[]).includes(status),
      );
    }
  });
});

describe("tracker path", () => {
  it("uses the step that suits the fulfillment", () => {
    expect(trackerSteps("pickup")).toEqual([
      "received",
      "brewing",
      "ready_for_pickup",
      "completed",
    ]);
    expect(trackerSteps("delivery")[2]).toBe("out_for_delivery");
  });

  it("finds the current step, and -1 for a cancelled order", () => {
    expect(trackerStepIndex("brewing", "delivery")).toBe(1);
    expect(trackerStepIndex("completed", "pickup")).toBe(3);
    expect(trackerStepIndex("cancelled", "pickup")).toBe(-1);
  });
});

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
