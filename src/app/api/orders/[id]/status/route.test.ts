// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_ID } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrderTracking: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/orders/queries", () => ({
  getOrderTracking: mocks.getOrderTracking,
}));

const { GET } = await import("./route");

const user = { id: "u1", role: "customer", branchId: null };

function get() {
  return GET(new Request(`http://localhost/api/orders/${ORDER_ID}/status`), {
    params: Promise.resolve({ id: ORDER_ID }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user });
});

describe("GET /api/orders/[id]/status", () => {
  it("is 401 for signed-out visitors, without loading the order", async () => {
    mocks.getSession.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(401);
    expect(mocks.getOrderTracking).not.toHaveBeenCalled();
  });

  it("is 404 for someone else's or a missing order", async () => {
    mocks.getOrderTracking.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(mocks.getOrderTracking).toHaveBeenCalledWith(ORDER_ID, user);
  });

  it("returns the tracking data and is never cached", async () => {
    const tracking = { status: "brewing", fulfillment: "pickup", events: [] };
    mocks.getOrderTracking.mockResolvedValue(tracking);
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(tracking);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
