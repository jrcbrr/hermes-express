"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders/queries";
import { sendReceiptEmail } from "./email";

export type EmailReceiptResult = { ok: boolean; message: string };

/** At most one send per order in each window of this length. */
const RESEND_WINDOW_MS = 60_000;

const NOT_FOUND = "We could not find this receipt.";

/**
 * Emails the receipt again when its owner asks. It only ever goes to the
 * address given at checkout: this action never takes an address.
 */
export async function emailReceipt(
  orderId: unknown,
): Promise<EmailReceiptResult> {
  const parsed = z.uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, message: NOT_FOUND };
  const id = parsed.data;

  const user = await requireUser(`/receipts/${id}`);
  const found = await getOrderForUser(id, user);
  // Staff may view the order, but only the customer may send its receipt.
  if (!found || found.userId !== user.id) {
    return { ok: false, message: NOT_FOUND };
  }

  const slot = Math.floor(Date.now() / RESEND_WINDOW_MS);
  const result = await sendReceiptEmail(
    id,
    user,
    `receipt/${id}/resend/${slot}`,
  );
  if (result === "sent") {
    return {
      ok: true,
      message: `Your receipt was sent to ${found.receiptEmail}.`,
    };
  }
  return {
    ok: false,
    message:
      result === "skipped"
        ? "Email receipts are not available right now. You may download the PDF instead."
        : "We could not send your receipt. Please try again shortly.",
  };
}
