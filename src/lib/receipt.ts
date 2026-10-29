/**
 * Receipts (docs/PLAN.md §7, "Receipts"). Pure functions that turn a saved
 * order into what a receipt shows. The receipt page, the PDF and the email
 * all render the same `Receipt`, so the three always match. Amounts stay in
 * centavos here; each renderer formats them with formatPeso().
 */
import { siteConfig, type BranchService } from "@/config/site";
import { formatPhPhone } from "./format";
import { assertCentavos } from "./money";
import { MANILA_TIME_ZONE, formatSlotTime } from "./schedule";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentStatus,
} from "./validation/checkout";

/** VAT is 12%, already included in every price. */
export const VAT_RATE_PERCENT = 12;

/** Digits in the counting part of a receipt number: HX-BGC-000123. */
const RECEIPT_DIGITS = 6;

/** The order fields a receipt needs. A loaded order (OrderDetails) fits this. */
export type ReceiptSource = {
  id: string;
  code: string;
  receiptNumber: number;
  branchSlug: string;
  branchName: string;
  branchAddress: string;
  fulfillment: BranchService;
  scheduledFor: Date | null;
  contactName: string;
  phone: string;
  receiptEmail: string;
  address: string | null;
  subtotalCentavos: number;
  discountCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  promoCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  items: readonly {
    id: string;
    name: string;
    quantity: number;
    unitPriceCentavos: number;
    lineTotalCentavos: number;
    config: { details: readonly string[] };
  }[];
};

export type ReceiptLine = {
  id: string;
  quantity: number;
  name: string;
  /** The drink's choices, e.g. "16oz · Iced · Oat milk". Empty for plain items. */
  details: string;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
};

export type Receipt = {
  orderId: string;
  /** e.g. "HX-BGC-000123". */
  number: string;
  /** The short order code, e.g. "HX-7K2P". */
  orderCode: string;
  shop: {
    name: string;
    branchName: string;
    address: string;
    phone: string;
    tin: string;
  };
  /** e.g. "Oct 30, 2026, 9:15 AM" (Manila). */
  issuedAt: string;
  fulfillment: "Pickup" | "Delivery";
  /** "As soon as possible" or e.g. "Scheduled: Oct 31, 2026, 9:00 AM". */
  timing: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    /** Delivery only. */
    address: string | null;
  };
  lines: ReceiptLine[];
  totals: {
    subtotalCentavos: number;
    discountCentavos: number;
    promoCode: string | null;
    /** Null for pickup orders; 0 means free delivery. */
    deliveryFeeCentavos: number | null;
    totalCentavos: number;
    vatableSalesCentavos: number;
    vatCentavos: number;
  };
  payment: { method: string; status: string };
  footer: { thanks: string; tagline: string; notice: string };
};

/** The short code for a branch, e.g. "BGC". Unknown slugs use their first letters. */
export function receiptCodeFor(branchSlug: string): string {
  const branch = siteConfig.branches.find((b) => b.slug === branchSlug);
  return (
    branch?.receiptCode ??
    branchSlug
      .replace(/[^a-z]/gi, "")
      .slice(0, 3)
      .toUpperCase()
  );
}

/** ("bgc", 123) -> "HX-BGC-000123". */
export function formatReceiptNumber(
  branchSlug: string,
  number: number,
): string {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new RangeError(`Receipt numbers start at 1, got ${number}`);
  }
  const digits = String(number).padStart(RECEIPT_DIGITS, "0");
  return `HX-${receiptCodeFor(branchSlug)}-${digits}`;
}

/**
 * Splits a VAT-inclusive total into VATable sales and 12% VAT. VAT is
 * total × 12/112, rounded to the nearest centavo; the two parts always add
 * back up to the total.
 */
export function vatFromTotal(totalCentavos: number): {
  vatableSalesCentavos: number;
  vatCentavos: number;
} {
  assertCentavos(totalCentavos);
  const vatCentavos = Math.round(
    (totalCentavos * VAT_RATE_PERCENT) / (100 + VAT_RATE_PERCENT),
  );
  return { vatableSalesCentavos: totalCentavos - vatCentavos, vatCentavos };
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Oct 30, 2026, 9:15 AM", in Manila time. */
export function formatReceiptDateTime(date: Date): string {
  return `${dateFormat.format(date)}, ${formatSlotTime(date)}`;
}

/** Everything a receipt shows, ready to render. */
export function buildReceipt(order: ReceiptSource): Receipt {
  const branch = siteConfig.branches.find((b) => b.slug === order.branchSlug);
  return {
    orderId: order.id,
    number: formatReceiptNumber(order.branchSlug, order.receiptNumber),
    orderCode: order.code,
    shop: {
      name: siteConfig.name,
      branchName: order.branchName,
      address: branch?.address ?? order.branchAddress,
      phone: siteConfig.contacts.phone.display,
      tin: siteConfig.tin,
    },
    issuedAt: formatReceiptDateTime(order.createdAt),
    fulfillment: order.fulfillment === "pickup" ? "Pickup" : "Delivery",
    timing:
      order.scheduledFor === null
        ? "As soon as possible"
        : `Scheduled: ${formatReceiptDateTime(order.scheduledFor)}`,
    customer: {
      name: order.contactName,
      phone: formatPhPhone(order.phone),
      email: order.receiptEmail,
      address: order.fulfillment === "delivery" ? order.address : null,
    },
    lines: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      name: item.name,
      details: item.config.details.join(" · "),
      unitPriceCentavos: item.unitPriceCentavos,
      lineTotalCentavos: item.lineTotalCentavos,
    })),
    totals: {
      subtotalCentavos: order.subtotalCentavos,
      discountCentavos: order.discountCentavos,
      promoCode: order.promoCode,
      deliveryFeeCentavos:
        order.fulfillment === "delivery" ? order.deliveryFeeCentavos : null,
      totalCentavos: order.totalCentavos,
      ...vatFromTotal(order.totalCentavos),
    },
    payment: {
      method: PAYMENT_METHOD_LABELS[order.paymentMethod],
      status:
        order.paymentStatus === "demo_paid" ? "Paid" : "To be paid on delivery",
    },
    footer: {
      thanks: `Thank you for ordering with ${siteConfig.name}`,
      tagline: siteConfig.tagline,
      notice: "Demo receipt. Not an official receipt.",
    },
  };
}
