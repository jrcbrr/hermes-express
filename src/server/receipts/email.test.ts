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
        subject: "Your Hermes Express sales receipt HX-BGC-000123",
        html: receiptEmailHtml(buildReceipt(pickupOrder)),
        attachments: [{ filename: "HX-BGC-000123.pdf", content: PDF }],
      },
      { idempotencyKey: `receipt/${ORDER_ID}` },
    );
  });

  it("uses the key it is given, so the button can send again", async () => {
    expect(await sendReceiptEmail(ORDER_ID, user, "receipt/again")).toBe(
      "sent",
    );
    expect(mocks.send).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: "receipt/again",
    });
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
  /** The email's visible text, one space between pieces. */
  const text = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ");

  it("prints the sales receipt: header, details, items, totals, VAT, buyer and notice", () => {
    const shown = text(receiptEmailHtml(buildReceipt(pickupOrder)));
    for (const piece of [
      "HERMES EXPRESS",
      "VAT REG TIN 301-707-321-000",
      "SALES RECEIPT",
      "Receipt No. HX-BGC-000123",
      "Date/Time 10/30/2026 09:15 AM",
      "Service PICKUP (ASAP)",
      "QTY DESCRIPTION AMOUNT",
      "2 CUSTOM LATTE @200.00 16oz / Iced / Latte / Oat milk 400.00",
      "1 BUTTER CROISSANT @95.00 95.00",
      "SUBTOTAL 495.00",
      "TOTAL AMOUNT DUE PHP 495.00",
      "VATable Sales 441.96 VAT-Exempt Sales 0.00 Zero-Rated Sales 0.00 VAT Amount (12%) 53.04",
      "PAYMENT: GCASH (DEMO) PAID",
      "SOLD TO Maria Santos",
      "DEMO RECEIPT. NOT AN OFFICIAL RECEIPT.",
    ]) {
      expect(shown).toContain(piece);
    }
    expect(shown).not.toContain("DELIVERY FEE");
    expect(shown).not.toContain("Address");
  });

  it("prints delivery details, a promo discount and FREE delivery", () => {
    const shown = text(receiptEmailHtml(buildReceipt(deliveryOrder)));
    expect(shown).toContain("LESS: DISCOUNT (FIRSTSIP) -50.00");
    expect(shown).toContain("DELIVERY FEE 49.00");
    expect(shown).toContain("Address Unit 5, 26th St, Wawa, Taguig City");
    const free = text(
      receiptEmailHtml(
        buildReceipt({
          ...deliveryOrder,
          promoCode: null,
          deliveryFeeCentavos: 0,
        }),
      ),
    );
    expect(free).toContain("DELIVERY FEE FREE");
    expect(free).toContain("LESS: DISCOUNT -50.00");
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
