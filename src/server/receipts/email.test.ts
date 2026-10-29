import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildReceipt } from "@/lib/receipt";
import { ORDER_ID, deliveryOrder, pickupOrder } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  getOrderForUser: vi.fn(),
  renderReceiptPdf: vi.fn(),
  send: vi.fn(),
  Resend: vi.fn(),
}));

vi.mock("@/server/orders/queries", () => ({
  getOrderForUser: mocks.getOrderForUser,
}));
vi.mock("./pdf", () => ({ renderReceiptPdf: mocks.renderReceiptPdf }));
vi.mock("resend", () => ({ Resend: mocks.Resend }));

const { escapeHtml, receiptEmailHtml, sendReceiptEmail } =
  await import("./email");

const user = { id: "u1", role: "customer", branchId: null };
const PDF = Buffer.from("%PDF-1.3 test");
const KEY = "test-key";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", KEY);
  vi.stubEnv("EMAIL_FROM", "Hermes Express <orders@example.com>");
  mocks.Resend.mockImplementation(function Resend() {
    return { emails: { send: mocks.send } };
  });
  mocks.getOrderForUser.mockResolvedValue(pickupOrder);
  mocks.renderReceiptPdf.mockResolvedValue(PDF);
  mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Everything written to the console, to check nothing private leaks. */
function logged(): string {
  return [
    ...vi.mocked(console.info).mock.calls,
    ...vi.mocked(console.error).mock.calls,
  ]
    .flat()
    .join("\n");
}

describe("sendReceiptEmail", () => {
  it("sends the receipt with its PDF to the checkout email, once per order", async () => {
    expect(await sendReceiptEmail(ORDER_ID, user)).toBe("sent");
    expect(mocks.Resend).toHaveBeenCalledWith(KEY);
    expect(mocks.getOrderForUser).toHaveBeenCalledWith(ORDER_ID, user);
    expect(mocks.send).toHaveBeenCalledWith(
      {
        from: "Hermes Express <orders@example.com>",
        to: "maria@example.com",
        subject: "Your Hermes Express receipt HX-BGC-000123",
        html: receiptEmailHtml(buildReceipt(pickupOrder)),
        attachments: [{ filename: "HX-BGC-000123.pdf", content: PDF }],
      },
      { idempotencyKey: `receipt/${ORDER_ID}` },
    );
  });

  it.each(["RESEND_API_KEY", "EMAIL_FROM"])(
    "is skipped without %s, and says so in the log",
    async (name) => {
      vi.stubEnv(name, "");
      expect(await sendReceiptEmail(ORDER_ID, user)).toBe("skipped");
      expect(mocks.send).not.toHaveBeenCalled();
      expect(mocks.getOrderForUser).not.toHaveBeenCalled();
      expect(logged()).toMatch(/skipped for order/);
    },
  );

  it("reports a Resend error without throwing or logging private details", async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid from address" },
    });
    expect(await sendReceiptEmail(ORDER_ID, user)).toBe("failed");
    expect(logged()).toMatch(/validation_error: Invalid from address/);
    expect(logged()).not.toContain(KEY);
    expect(logged()).not.toContain("maria@example.com");
  });

  it("reports a thrown error (e.g. the network) without throwing", async () => {
    mocks.send.mockRejectedValue(new Error("fetch failed"));
    expect(await sendReceiptEmail(ORDER_ID, user)).toBe("failed");
    mocks.renderReceiptPdf.mockRejectedValue("bad font");
    expect(await sendReceiptEmail(ORDER_ID, user)).toBe("failed");
    expect(logged()).toMatch(/fetch failed/);
    expect(logged()).toMatch(/bad font/);
  });

  it("fails quietly when the order can't be loaded", async () => {
    mocks.getOrderForUser.mockResolvedValue(null);
    expect(await sendReceiptEmail(ORDER_ID, user)).toBe("failed");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("receiptEmailHtml", () => {
  it("shows the receipt's details, items, totals and notice", () => {
    const html = receiptEmailHtml(buildReceipt(pickupOrder));
    for (const text of [
      "HX-BGC-000123",
      "TIN 000-000-000-000",
      "2 × Custom Latte",
      "16oz · Iced · Latte · Oat milk",
      "₱495",
      "VAT (12%)",
      "₱53.04",
      "GCash (Demo) · Paid",
      "Demo receipt. Not an official receipt.",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("Delivery fee");
    expect(html).not.toContain("Deliver to");
  });

  it("shows delivery details, a promo discount and free delivery", () => {
    const html = receiptEmailHtml(buildReceipt(deliveryOrder));
    expect(html).toContain("Deliver to");
    expect(html).toContain("Discount (FIRSTSIP)");
    expect(html).toContain("₱49");
    const free = receiptEmailHtml(
      buildReceipt({
        ...deliveryOrder,
        promoCode: null,
        deliveryFeeCentavos: 0,
      }),
    );
    expect(free).toContain("Free");
    expect(free).toContain(">Discount<");
  });

  it("escapes text the customer typed", () => {
    const html = receiptEmailHtml(
      buildReceipt({ ...pickupOrder, contactName: '<script>"x"</script>' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });
});
