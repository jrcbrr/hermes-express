import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return {
    ...mockDb(),
    role: { current: "admin" as string | null },
    write: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/orders/transition", () => ({
  writeOrderTransition: mocks.write,
}));
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!mocks.role.current || !roles.includes(mocks.role.current)) {
      throw new Error("NEXT_REDIRECT");
    }
    return { id: "admin-1", role: mocks.role.current };
  }),
}));

const { updateOrderStatus } = await import("./order-actions");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const pickup = { status: "received", fulfillment: "pickup" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.role.current = "admin";
  mocks.state.selects = [[pickup]];
  mocks.write.mockResolvedValue(true);
});

describe("updateOrderStatus", () => {
  it.each(["customer", "barista", null])("turns away %s", async (role) => {
    mocks.role.current = role;
    await expect(
      updateOrderStatus({ orderId: ID, to: "brewing" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("moves the order and records the admin", async () => {
    expect(await updateOrderStatus({ orderId: ID, to: "brewing" })).toEqual({
      ok: true,
    });
    expect(mocks.write).toHaveBeenCalledWith({
      orderId: ID,
      from: "received",
      to: "brewing",
      changedByUserId: "admin-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it("rejects bad input", async () => {
    const result = await updateOrderStatus({ orderId: "x", to: "brewing" });
    expect(result.ok).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("reports a missing order", async () => {
    mocks.state.selects = [[]];
    expect(await updateOrderStatus({ orderId: ID, to: "brewing" })).toEqual({
      ok: false,
      message: "We could not find this order.",
    });
  });

  it("rejects a move the rules don't allow", async () => {
    const result = await updateOrderStatus({ orderId: ID, to: "completed" });
    expect(result.ok).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("rejects delivery statuses on a pickup order", async () => {
    mocks.state.selects = [[{ status: "brewing", fulfillment: "pickup" }]];
    const result = await updateOrderStatus({
      orderId: ID,
      to: "out_for_delivery",
    });
    expect(result.ok).toBe(false);
  });

  it("reports when someone else moved it first", async () => {
    mocks.write.mockResolvedValue(false);
    const result = await updateOrderStatus({ orderId: ID, to: "brewing" });
    expect(result.ok).toBe(false);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
