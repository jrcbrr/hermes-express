// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_ID, pickupOrder } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrderForUser: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/orders/queries", () => ({
  getOrderForUser: mocks.getOrderForUser,
}));

const { GET } = await import("./route");

const user = { id: "u1", role: "customer", branchId: null };

function get(id = ORDER_ID) {
  return GET(new Request(`http://localhost/api/receipts/${id}/pdf`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user });
});

describe("GET /api/receipts/[id]/pdf", () => {
  it("is 401 for signed-out visitors, without loading the order", async () => {
    mocks.getSession.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(401);
    expect(mocks.getOrderForUser).not.toHaveBeenCalled();
  });

  it("is 404 for someone else's or a missing order", async () => {
    mocks.getOrderForUser.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(mocks.getOrderForUser).toHaveBeenCalledWith(ORDER_ID, user);
  });

  it("sends the owner a PDF named after the receipt number", async () => {
    mocks.getOrderForUser.mockResolvedValue(pickupOrder);
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="HX-BGC-000123.pdf"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  }, 30_000);
});
