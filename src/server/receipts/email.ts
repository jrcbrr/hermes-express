// Emails the receipt (with its PDF) after an order is placed. Sending is best
// effort: a missing configuration or a Resend error is logged, never thrown,
// so it can't affect the order.
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import type { SessionUser } from "@/lib/auth";
import { formatAmount, formatPesoPlain } from "@/lib/money";
import {
  buildReceipt,
  type Receipt,
  type ReceiptAmountRow,
  type ReceiptRow,
} from "@/lib/receipt";
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

// Raw colours: email apps can't read the site's CSS variables. A printed
// receipt is black on white; the page around it matches globals.css (cream).
const RULE = "border-top:1px dashed #000000;";
const CELL = "padding:1px 0;vertical-align:top;";

function row({ label, value }: ReceiptRow, bold = false): string {
  const weight = bold ? "font-weight:bold;" : "";
  return `<tr><td style="${CELL}${weight}">${escapeHtml(label)}</td><td style="${CELL}text-align:right;${weight}">${escapeHtml(value)}</td></tr>`;
}

function amountRow(amount: ReceiptAmountRow): string {
  return row({
    label: amount.label,
    value: "text" in amount ? amount.text : formatAmount(amount.centavos),
  });
}

function section(rows: string, extra = ""): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;${RULE}margin-top:8px;padding-top:6px;${extra}">${rows}</table>`;
}

/**
 * The receipt as an HTML email, laid out like the printed sales receipt
 * (inline styles and tables, as email apps need).
 */
export function receiptEmailHtml(receipt: Receipt): string {
  const { header, total, payment, footer } = receipt;
  const lines = receipt.lines
    .map((line) => {
      const unit = `@${formatAmount(line.unitPriceCentavos)}${line.details ? ` ${line.details}` : ""}`;
      return `<tr><td style="${CELL}width:32px;">${line.quantity}</td><td style="${CELL}">${escapeHtml(line.description)}<br>${escapeHtml(unit)}</td><td style="${CELL}text-align:right;">${formatAmount(line.lineTotalCentavos)}</td></tr>`;
    })
    .join("");
  const soldTo = receipt.soldTo.map((r) => row(r)).join("");

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px 12px;background:#faf6ef;">
<p style="max-width:380px;margin:0 auto 12px;font-family:Arial,sans-serif;font-size:14px;color:#000000;">Thank you for your order. Your sales receipt is below, and a PDF copy is attached.</p>
<div style="max-width:380px;margin:0 auto;background:#ffffff;border:1px solid #d9d9d9;padding:20px 16px;color:#000000;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.45;">
<div style="text-align:center;">
<div style="font-size:16px;font-weight:bold;">${escapeHtml(header.shopName)}</div>
<div>${escapeHtml(header.branch)}</div>
<div>${escapeHtml(header.phone)}</div>
<div>${escapeHtml(header.tin)}</div>
<div style="margin-top:10px;font-weight:bold;letter-spacing:3px;">${escapeHtml(header.title)}</div>
</div>
${section(receipt.details.map((r) => row(r)).join(""))}
${section(`<tr><td style="${CELL}width:32px;">QTY</td><td style="${CELL}">DESCRIPTION</td><td style="${CELL}text-align:right;">AMOUNT</td></tr>${lines}`)}
${section(receipt.amounts.map(amountRow).join("") + row({ label: total.label, value: formatPesoPlain(total.centavos) }, true))}
${section(receipt.vat.map(amountRow).join(""))}
${section(row(payment) + soldTo)}
<div style="${RULE}margin-top:8px;padding-top:8px;text-align:center;">
<div>${escapeHtml(footer.thanks)}</div>
<div>${escapeHtml(footer.tagline)}</div>
<div style="margin-top:6px;font-weight:bold;">${escapeHtml(footer.notice)}</div>
</div>
</div>
</body>
</html>`;
}

/**
 * Sends the order's receipt to the address given at checkout. Skipped when
 * RESEND_API_KEY or EMAIL_FROM is not set. Logs never include the key or the
 * customer's address. Resend sends at most once per key, even if this runs
 * twice; the default key means once per order.
 */
export async function sendReceiptEmail(
  orderId: string,
  user: Pick<SessionUser, "id" | "role" | "branchId">,
  idempotencyKey = `receipt/${orderId}`,
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
        subject: `Your ${siteConfig.name} sales receipt ${receipt.number}`,
        html: receiptEmailHtml(receipt),
        attachments: [{ filename: `${receipt.number}.pdf`, content: pdf }],
      },
      { idempotencyKey },
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
