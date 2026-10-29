// Emails the receipt (with its PDF) after an order is placed. Sending is best
// effort: a missing configuration or a Resend error is logged, never thrown,
// so it can't affect the order.
import { Resend } from "resend";
import type { SessionUser } from "@/lib/auth";
import { formatPeso } from "@/lib/money";
import { buildReceipt, type Receipt } from "@/lib/receipt";
import { getOrderForUser } from "@/server/orders/queries";
import { renderReceiptPdf } from "./pdf";

export type ReceiptEmailResult = "sent" | "skipped" | "failed";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Makes customer-typed text (names, addresses) safe to put in HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function row(label: string, value: string, bold = false): string {
  const weight = bold ? "font-weight:bold;" : "";
  return `<tr><td style="padding:2px 0;${weight}">${escapeHtml(label)}</td><td style="padding:2px 0;text-align:right;${weight}">${escapeHtml(value)}</td></tr>`;
}

/** The receipt as a simple HTML email (inline styles, as email apps need). */
export function receiptEmailHtml(receipt: Receipt): string {
  const { shop, customer, totals, payment, footer } = receipt;
  const details = [
    ["Receipt no.", receipt.number],
    ["Order code", receipt.orderCode],
    ["Date", receipt.issuedAt],
    [receipt.fulfillment, receipt.timing],
    ["Customer", customer.name],
    ["Phone", customer.phone],
    ...(customer.address ? [["Deliver to", customer.address]] : []),
  ];
  const lines = receipt.lines.map((line) => {
    const details = line.details
      ? `<br><span style="color:#7a6a5d;">${escapeHtml(line.details)}</span>`
      : "";
    return `<tr><td style="padding:4px 0;"><strong>${line.quantity} × ${escapeHtml(line.name)}</strong>${details}</td><td style="padding:4px 0;text-align:right;vertical-align:top;">${formatPeso(line.lineTotalCentavos)}</td></tr>`;
  });
  const amounts = [
    row("Subtotal", formatPeso(totals.subtotalCentavos)),
    totals.discountCentavos > 0
      ? row(
          `Discount${totals.promoCode ? ` (${totals.promoCode})` : ""}`,
          `−${formatPeso(totals.discountCentavos)}`,
        )
      : "",
    totals.deliveryFeeCentavos !== null
      ? row(
          "Delivery fee",
          totals.deliveryFeeCentavos === 0
            ? "Free"
            : formatPeso(totals.deliveryFeeCentavos),
        )
      : "",
    row("Total", formatPeso(totals.totalCentavos), true),
    row("VATable sales", formatPeso(totals.vatableSalesCentavos)),
    row("VAT (12%)", formatPeso(totals.vatCentavos)),
    row("Payment", `${payment.method} · ${payment.status}`),
  ];

  // Raw colours: email apps can't read the site's CSS variables. Values match globals.css.
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#faf6ef;color:#2b1e17;font-family:Inter,Arial,sans-serif;font-size:14px;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px;">
<h1 style="margin:0;text-align:center;font-size:22px;color:#b8892e;">${escapeHtml(shop.name)}</h1>
<p style="margin:4px 0 0;text-align:center;">${escapeHtml(shop.branchName)} · ${escapeHtml(shop.address)}<br>Phone ${escapeHtml(shop.phone)} · TIN ${escapeHtml(shop.tin)}</p>
<p style="margin:16px 0;">Dear ${escapeHtml(customer.name)}, thank you for your order. Your receipt is below, and a PDF copy is attached.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px dashed #e5dccf;padding-top:8px;">${details.map(([label, value]) => row(label!, value!)).join("")}</table>
<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px dashed #e5dccf;margin-top:8px;">${lines.join("")}</table>
<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px dashed #e5dccf;margin-top:8px;">${amounts.join("")}</table>
<p style="margin:16px 0 0;text-align:center;font-weight:bold;">${escapeHtml(footer.thanks)}</p>
<p style="margin:4px 0 0;text-align:center;color:#7a6a5d;">${escapeHtml(footer.tagline)}</p>
<p style="margin:12px 0 0;text-align:center;font-size:11px;font-weight:bold;text-transform:uppercase;">${escapeHtml(footer.notice)}</p>
</div>
</body>
</html>`;
}

/**
 * Sends the order's receipt to the address given at checkout. Skipped when
 * RESEND_API_KEY or EMAIL_FROM is not set. Logs never include the key or the
 * customer's address.
 */
export async function sendReceiptEmail(
  orderId: string,
  user: Pick<SessionUser, "id" | "role" | "branchId">,
): Promise<ReceiptEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(
      `Receipt email skipped for order ${orderId}: RESEND_API_KEY or EMAIL_FROM is not set.`,
    );
    return "skipped";
  }

  try {
    const order = await getOrderForUser(orderId, user);
    if (!order) {
      console.error(
        `Receipt email failed for order ${orderId}: order not found.`,
      );
      return "failed";
    }
    const receipt = buildReceipt(order);
    const pdf = await renderReceiptPdf(receipt);
    const { error } = await new Resend(apiKey).emails.send(
      {
        from,
        to: order.receiptEmail,
        subject: `Your ${receipt.shop.name} receipt ${receipt.number}`,
        html: receiptEmailHtml(receipt),
        attachments: [{ filename: `${receipt.number}.pdf`, content: pdf }],
      },
      // Resend sends at most once per key, even if this runs twice.
      { idempotencyKey: `receipt/${orderId}` },
    );
    if (error) {
      console.error(
        `Receipt email failed for order ${orderId}: ${error.name}: ${error.message}`,
      );
      return "failed";
    }
    return "sent";
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Receipt email failed for order ${orderId}: ${reason}`);
    return "failed";
  }
}
