/**
 * Receipts (docs/PLAN.md §7, "Receipts"), laid out like a Philippine sales
 * receipt. Pure functions that turn a saved order into the rows a receipt
 * prints, top to bottom. The receipt page, the PDF and the email all render
 * the same `Receipt`, so the three always match. Amounts stay in centavos
 * here; each renderer formats them (formatAmount, formatPesoPlain).
 */
import { siteConfig, type BranchService } from "@/config/site";
import { formatPhPhone } from "./format";
import { assertCentavos } from "./money";
import { MANILA_TIME_ZONE } from "./schedule";
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
  pointsRedeemed: number;
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

/** A label and its value, e.g. "Receipt No." / "HX-BGC-000123". */
export type ReceiptRow = { label: string; value: string };

/** A label and an amount, or a word instead of an amount (e.g. "FREE"). */
export type ReceiptAmountRow =
  { label: string; centavos: number } | { label: string; text: string };

export type ReceiptLine = {
  id: string;
  quantity: number;
  /** Upper case, e.g. "CUSTOM LATTE". */
  description: string;
  unitPriceCentavos: number;
  /** The drink's choices, e.g. "16oz / Iced / Oat milk". Empty for plain items. */
  details: string;
  lineTotalCentavos: number;
};

export type Receipt = {
  orderId: string;
  /** e.g. "HX-BGC-000123". */
  number: string;
  header: {
    /** Upper case, e.g. "HERMES EXPRESS". */
    shopName: string;
    /** e.g. "BGC · High Street Kiosk, Bonifacio Global City". */
    branch: string;
    /** e.g. "Tel. 0939 008 2560". */
    phone: string;
    /** e.g. "VAT REG TIN 301-707-321-000". */
    tin: string;
    title: "SALES RECEIPT";
  };
  /** Receipt No., Order Code, Date/Time, Service. */
  details: ReceiptRow[];
  lines: ReceiptLine[];
  /** Subtotal, then a discount and delivery fee when they apply. */
  amounts: ReceiptAmountRow[];
  total: { label: "TOTAL AMOUNT DUE"; centavos: number };
  /** VATable, VAT-exempt and zero-rated sales, and the VAT amount. */
  vat: ReceiptAmountRow[];
  payment: ReceiptRow;
  /** Sold to, phone, email, and the delivery address if any. */
  soldTo: ReceiptRow[];
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

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** "10/30/2026 09:15 AM", in Manila time, as printed on receipts. */
export function formatReceiptDateTime(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ??
    "";
  const period = part("dayPeriod").toUpperCase();
  return `${part("month")}/${part("day")}/${part("year")} ${part("hour")}:${part("minute")} ${period}`;
}

/** Everything a receipt prints, ready to render. */
export function buildReceipt(order: ReceiptSource): Receipt {
  const branch = siteConfig.branches.find((b) => b.slug === order.branchSlug);
  const timing =
    order.scheduledFor === null
      ? "ASAP"
      : `SCHEDULED ${formatReceiptDateTime(order.scheduledFor)}`;
  const { vatableSalesCentavos, vatCentavos } = vatFromTotal(
    order.totalCentavos,
  );

  const amounts: ReceiptAmountRow[] = [
    { label: "SUBTOTAL", centavos: order.subtotalCentavos },
  ];
  if (order.discountCentavos > 0) {
    const sources = [
      order.promoCode,
      order.pointsRedeemed > 0 ? `${order.pointsRedeemed} PTS` : null,
    ].filter(Boolean);
    amounts.push({
      label:
        sources.length > 0
          ? `LESS: DISCOUNT (${sources.join(", ")})`
          : "LESS: DISCOUNT",
      centavos: -order.discountCentavos,
    });
  }
  if (order.fulfillment === "delivery") {
    amounts.push(
      order.deliveryFeeCentavos === 0
        ? { label: "DELIVERY FEE", text: "FREE" }
        : { label: "DELIVERY FEE", centavos: order.deliveryFeeCentavos },
    );
  }

  const soldTo: ReceiptRow[] = [
    { label: "SOLD TO", value: order.contactName },
    { label: "Phone", value: formatPhPhone(order.phone) },
    { label: "Email", value: order.receiptEmail },
  ];
  if (order.fulfillment === "delivery" && order.address) {
    soldTo.push({ label: "Address", value: order.address });
  }

  return {
    orderId: order.id,
    number: formatReceiptNumber(order.branchSlug, order.receiptNumber),
    header: {
      shopName: siteConfig.name.toUpperCase(),
      branch: `${order.branchName} · ${branch?.address ?? order.branchAddress}`,
      phone: `Tel. ${siteConfig.contacts.phone.display}`,
      tin: `VAT REG TIN ${siteConfig.tin}`,
      title: "SALES RECEIPT",
    },
    details: [
      {
        label: "Receipt No.",
        value: formatReceiptNumber(order.branchSlug, order.receiptNumber),
      },
      { label: "Order Code", value: order.code },
      { label: "Date/Time", value: formatReceiptDateTime(order.createdAt) },
      {
        label: "Service",
        value: `${order.fulfillment.toUpperCase()} (${timing})`,
      },
    ],
    lines: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      description: item.name.toUpperCase(),
      unitPriceCentavos: item.unitPriceCentavos,
      details: item.config.details.join(" / "),
      lineTotalCentavos: item.lineTotalCentavos,
    })),
    amounts,
    total: { label: "TOTAL AMOUNT DUE", centavos: order.totalCentavos },
    vat: [
      { label: "VATable Sales", centavos: vatableSalesCentavos },
      // Everything on the menu is VATable; PH receipts still list these lines.
      { label: "VAT-Exempt Sales", centavos: 0 },
      { label: "Zero-Rated Sales", centavos: 0 },
      { label: `VAT Amount (${VAT_RATE_PERCENT}%)`, centavos: vatCentavos },
    ],
    payment: {
      label: `PAYMENT: ${PAYMENT_METHOD_LABELS[order.paymentMethod].toUpperCase()}`,
      value:
        order.paymentStatus === "demo_paid"
          ? "PAID"
          : order.paymentMethod === "cash_pickup"
            ? "TO BE PAID AT PICKUP"
            : "TO BE PAID ON DELIVERY",
    },
    soldTo,
    footer: {
      thanks: `Thank you for ordering with ${siteConfig.name}`,
      tagline: siteConfig.tagline,
      notice: "DEMO RECEIPT. NOT AN OFFICIAL RECEIPT.",
    },
  };
}
