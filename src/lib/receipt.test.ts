import { describe, expect, it } from "vitest";
import { deliveryOrder, pickupOrder } from "@/test/order-fixture";
import {
  buildReceipt,
  formatReceiptDateTime,
  formatReceiptNumber,
  receiptCodeFor,
  vatFromTotal,
} from "./receipt";

describe("formatReceiptNumber", () => {
  it("uses the branch code and six digits", () => {
    expect(formatReceiptNumber("bgc", 123)).toBe("HX-BGC-000123");
    expect(formatReceiptNumber("tipas", 1)).toBe("HX-TIP-000001");
    expect(formatReceiptNumber("taguig-lakeshore", 1234567)).toBe(
      "HX-TLK-1234567",
    );
  });

  it("refuses numbers below 1 or with decimals", () => {
    expect(() => formatReceiptNumber("bgc", 0)).toThrow(RangeError);
    expect(() => formatReceiptNumber("bgc", 1.5)).toThrow(RangeError);
  });
});

describe("receiptCodeFor", () => {
  it("falls back to the first letters of an unknown branch", () => {
    expect(receiptCodeFor("new-branch")).toBe("NEW");
  });
});

describe("vatFromTotal", () => {
  it("takes 12/112 of the total as VAT", () => {
    expect(vatFromTotal(11200)).toEqual({
      vatableSalesCentavos: 10000,
      vatCentavos: 1200,
    });
    expect(vatFromTotal(0)).toEqual({
      vatableSalesCentavos: 0,
      vatCentavos: 0,
    });
  });

  it("rounds VAT to the nearest centavo and always adds back to the total", () => {
    // 49500 × 12 / 112 = 5303.57…
    expect(vatFromTotal(49500)).toEqual({
      vatableSalesCentavos: 44196,
      vatCentavos: 5304,
    });
    for (const total of [1, 99, 12345, 49400, 80000]) {
      const { vatableSalesCentavos, vatCentavos } = vatFromTotal(total);
      expect(vatableSalesCentavos + vatCentavos).toBe(total);
    }
  });

  it("refuses amounts that are not whole centavos", () => {
    expect(() => vatFromTotal(10.5)).toThrow(TypeError);
  });
});

describe("formatReceiptDateTime", () => {
  it("prints MM/DD/YYYY and a two-digit hour, in Manila time", () => {
    expect(formatReceiptDateTime(new Date("2026-10-30T01:15:00.000Z"))).toBe(
      "10/30/2026 09:15 AM",
    );
    // 11:30 PM on Oct 30 in UTC is already Oct 31 in Manila.
    expect(formatReceiptDateTime(new Date("2026-10-30T23:30:00.000Z"))).toBe(
      "10/31/2026 07:30 AM",
    );
    expect(formatReceiptDateTime(new Date("2026-12-31T16:05:00.000Z"))).toBe(
      "01/01/2027 12:05 AM",
    );
    expect(formatReceiptDateTime(new Date("2026-10-30T10:45:00.000Z"))).toBe(
      "10/30/2026 06:45 PM",
    );
  });
});

describe("cash at pickup", () => {
  it("says it is paid at pickup", () => {
    const receipt = buildReceipt({
      ...pickupOrder,
      fulfillment: "pickup",
      paymentStatus: "unpaid",
      paymentMethod: "cash_pickup",
    });
    expect(receipt.payment).toEqual({
      label: "PAYMENT: CASH AT PICKUP",
      value: "TO BE PAID AT PICKUP",
    });
  });
});

describe("buildReceipt", () => {
  it("builds a pickup sales receipt", () => {
    expect(buildReceipt(pickupOrder)).toEqual({
      orderId: pickupOrder.id,
      number: "HX-BGC-000123",
      header: {
        shopName: "HERMES EXPRESS",
        branch: "BGC · High Street Kiosk, Bonifacio Global City",
        phone: "Tel. 0939 008 2560",
        tin: "VAT REG TIN 301-707-321-000",
        title: "SALES RECEIPT",
      },
      details: [
        { label: "Receipt No.", value: "HX-BGC-000123" },
        { label: "Order Code", value: "HX-7K2P" },
        { label: "Date/Time", value: "10/30/2026 09:15 AM" },
        { label: "Service", value: "PICKUP (ASAP)" },
      ],
      lines: [
        {
          id: "i1",
          quantity: 2,
          description: "CUSTOM LATTE",
          unitPriceCentavos: 20000,
          details: "16oz / Iced / Latte / Oat milk",
          lineTotalCentavos: 40000,
        },
        {
          id: "i2",
          quantity: 1,
          description: "BUTTER CROISSANT",
          unitPriceCentavos: 9500,
          details: "",
          lineTotalCentavos: 9500,
        },
      ],
      amounts: [{ label: "SUBTOTAL", centavos: 49500 }],
      total: { label: "TOTAL AMOUNT DUE", centavos: 49500 },
      vat: [
        { label: "VATable Sales", centavos: 44196 },
        { label: "VAT-Exempt Sales", centavos: 0 },
        { label: "Zero-Rated Sales", centavos: 0 },
        { label: "VAT Amount (12%)", centavos: 5304 },
      ],
      payment: { label: "PAYMENT: GCASH (DEMO)", value: "PAID" },
      soldTo: [
        { label: "SOLD TO", value: "Maria Santos" },
        { label: "Phone", value: "0917 123 4567" },
        { label: "Email", value: "maria@example.com" },
      ],
      footer: {
        thanks: "Thank you for ordering with Hermes Express",
        tagline: "Brewed by you. Delivered by Hermes.",
        notice: "DEMO RECEIPT. NOT AN OFFICIAL RECEIPT.",
      },
    });
  });

  it("builds a scheduled cash delivery receipt with a promo", () => {
    const receipt = buildReceipt(deliveryOrder);
    expect(receipt.details[3]).toEqual({
      label: "Service",
      value: "DELIVERY (SCHEDULED 10/31/2026 09:00 AM)",
    });
    expect(receipt.amounts).toEqual([
      { label: "SUBTOTAL", centavos: 49500 },
      { label: "LESS: DISCOUNT (FIRSTSIP)", centavos: -5000 },
      { label: "DELIVERY FEE", centavos: 4900 },
    ]);
    expect(receipt.total.centavos).toBe(49400);
    expect(receipt.payment).toEqual({
      label: "PAYMENT: CASH ON DELIVERY",
      value: "TO BE PAID ON DELIVERY",
    });
    expect(receipt.soldTo.at(-1)).toEqual({
      label: "Address",
      value: "Unit 5, 26th St, Wawa, Taguig City",
    });
  });

  it("prints FREE delivery and a discount without a code", () => {
    const receipt = buildReceipt({
      ...deliveryOrder,
      promoCode: null,
      deliveryFeeCentavos: 0,
    });
    expect(receipt.amounts.slice(1)).toEqual([
      { label: "LESS: DISCOUNT", centavos: -5000 },
      { label: "DELIVERY FEE", text: "FREE" },
    ]);
  });

  it("uses the address saved in the database for a branch not in the site config", () => {
    const receipt = buildReceipt({
      ...pickupOrder,
      branchSlug: "new-branch",
      branchAddress: "Somewhere, Taguig",
    });
    expect(receipt.header.branch).toBe("BGC · Somewhere, Taguig");
    expect(receipt.number).toBe("HX-NEW-000123");
  });
});
