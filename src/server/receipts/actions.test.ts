import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_ID, pickupOrder } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOrderForUser: vi.fn(),
  sendReceiptEmail: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/orders/queries", () => ({
  getOrderForUser: mocks.getOrderForUser,
}));
vi.mock("./email", () => ({ sendReceiptEmail: mocks.sendReceiptEmail }));

const { emailReceipt } = await import("./actions");

const user = { id: "u1", role: "customer", branchId: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ now: new Date("2026-10-31T01:00:10.000Z") });
  mocks.requireUser.mockResolvedValue(user);
  mocks.getOrderForUser.mockResolvedValue(pickupOrder);
  mocks.sendReceiptEmail.mockResolvedValue("sent");
});

afterEach(() => {
  vi.useRealTimers();
});

const keyOfCall = (call: number) =>
  mocks.sendReceiptEmail.mock.calls[call]?.[2] as string;

describe("emailReceipt", () => {
  it("sends the owner's receipt and names the checkout email", async () => {
    expect(await emailReceipt(ORDER_ID)).toEqual({
      ok: true,
      message: "Your receipt was sent to maria@example.com.",
    });
    expect(mocks.requireUser).toHaveBeenCalledWith(`/receipts/${ORDER_ID}`);
    expect(mocks.sendReceiptEmail).toHaveBeenCalledWith(
      ORDER_ID,
      user,
      expect.stringContaining(`receipt/${ORDER_ID}/resend/`),
    );
  });

  it("uses one key within a minute and a new one after, unlike the order email's", async () => {
    await emailReceipt(ORDER_ID);
    await emailReceipt(ORDER_ID);
    vi.advanceTimersByTime(60_000);
    await emailReceipt(ORDER_ID);
    expect(keyOfCall(1)).toBe(keyOfCall(0));
    expect(keyOfCall(2)).not.toBe(keyOfCall(0));
    expect(keyOfCall(0)).not.toBe(`receipt/${ORDER_ID}`);
  });

  it.each([ORDER_ID.slice(1), "", null, 42])(
    "refuses a bad order id (%s) before checking the session",
    async (bad) => {
      expect((await emailReceipt(bad)).ok).toBe(false);
      expect(mocks.requireUser).not.toHaveBeenCalled();
      expect(mocks.sendReceiptEmail).not.toHaveBeenCalled();
    },
  );

  it("refuses a missing or someone else's order", async () => {
    mocks.getOrderForUser.mockResolvedValue(null);
    expect(await emailReceipt(ORDER_ID)).toEqual({
      ok: false,
      message: "We could not find this receipt.",
    });
    expect(mocks.sendReceiptEmail).not.toHaveBeenCalled();
  });

  it("refuses staff who can view the order but do not own it", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      branchId: null,
    });
    expect((await emailReceipt(ORDER_ID)).ok).toBe(false);
    expect(mocks.sendReceiptEmail).not.toHaveBeenCalled();
  });

  it("offers the PDF when email is not configured", async () => {
    mocks.sendReceiptEmail.mockResolvedValue("skipped");
    const result = await emailReceipt(ORDER_ID);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/download the PDF/);
  });

  it("asks to try again when sending fails", async () => {
    mocks.sendReceiptEmail.mockResolvedValue("failed");
    const result = await emailReceipt(ORDER_ID);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/try again/);
  });
});
