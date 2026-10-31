// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildReceipt } from "@/lib/receipt";
import { deliveryOrder, pickupOrder } from "@/test/order-fixture";
import { renderReceiptPdf } from "./pdf";

/** The PDF's page count, read from its page tree. */
function pageCount(pdf: Buffer): number {
  const match = /\/Count (\d+)/.exec(pdf.toString("latin1"));
  return match ? Number(match[1]) : 0;
}

describe("renderReceiptPdf", () => {
  it.each([
    ["a pickup", pickupOrder],
    ["a delivery with a promo", deliveryOrder],
    [
      "a free delivery with an unnamed discount",
      { ...deliveryOrder, promoCode: null, deliveryFeeCentavos: 0 },
    ],
  ])(
    "renders %s receipt on one page",
    async (_, order) => {
      const pdf = await renderReceiptPdf(buildReceipt(order));
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(pageCount(pdf)).toBe(1);
    },
    30_000,
  );
});
