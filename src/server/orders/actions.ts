"use server";

import { randomInt, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { getDb } from "@/db";
import { branch, order, orderItem, orderStatusEvent } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { priceCartItems } from "@/lib/cart";
import { INITIAL_ORDER_STATUS } from "@/lib/order-status";
import { draftOrder, generateOrderCode, type OrderProblem } from "@/lib/orders";
import { isAsapAvailable, isValidSlot } from "@/lib/schedule";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  checkoutSchema,
  paymentStatusFor,
  type CheckoutData,
} from "@/lib/validation/checkout";
import { requireUser } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";
import { sendReceiptEmail } from "@/server/receipts/email";

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      message: string;
      errors?: FieldErrors;
      problems?: OrderProblem[];
    };

/** How many fresh codes to try if one is already taken (very unlikely). */
const CODE_ATTEMPTS = 5;

function fail(
  message: string,
  extra: Omit<Extract<PlaceOrderResult, { ok: false }>, "ok" | "message"> = {},
): PlaceOrderResult {
  return { ok: false, message, ...extra };
}

/** The constraint name of a Postgres unique violation, or null for other errors. */
function uniqueViolation(error: unknown): string | null {
  let current: unknown = error;
  // Drizzle wraps the driver's error; the Postgres details sit in `cause`.
  for (let depth = 0; depth < 3 && current instanceof Object; depth++) {
    const e = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (e.code === "23505") {
      return typeof e.constraint === "string" ? e.constraint : "";
    }
    current = e.cause;
  }
  return null;
}

async function findPlacedOrder(
  userId: string,
  clientRequestId: string,
): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: order.id })
    .from(order)
    .where(
      and(eq(order.userId, userId), eq(order.clientRequestId, clientRequestId)),
    );
  return row?.id ?? null;
}

/** Checks ASAP or the chosen slot against the branch's hours, on the server's clock. */
function timingError(
  data: CheckoutData,
  hours: { opensAt: string; closesAt: string },
  now: Date,
): FieldErrors | null {
  if (data.scheduledFor === null) {
    return isAsapAvailable(hours, now)
      ? null
      : {
          timing:
            "This branch is not taking orders for right now. Please schedule your order for later.",
        };
  }
  return isValidSlot(hours, data.scheduledFor, now)
    ? null
    : {
        scheduledFor:
          "That time is no longer available. Please choose another time.",
      };
}

/**
 * Places an order (docs/PLAN.md §7). Everything from the browser is checked
 * again here, and every price is recomputed from the catalog: prices sent by
 * the browser are never read. The order, its items and its first status are
 * saved together, so an order is never half-saved.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const user = await requireUser("/checkout");

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted details.", {
      errors: toFieldErrors(parsed.error),
    });
  }
  const data = parsed.data;

  // A double tap, or a retry after a dropped connection: same order.
  const placed = await findPlacedOrder(user.id, data.clientRequestId);
  if (placed !== null) return { ok: true, orderId: placed };

  const db = getDb();
  const [branchRow] = await db
    .select({
      id: branch.id,
      opensAt: branch.opensAt,
      closesAt: branch.closesAt,
      isActive: branch.isActive,
    })
    .from(branch)
    .where(eq(branch.slug, data.branch));
  const services: readonly string[] =
    siteConfig.branches.find((b) => b.slug === data.branch)?.services ?? [];
  if (!branchRow?.isActive || !services.includes(data.fulfillment)) {
    return fail("Please choose another branch.", {
      errors: {
        branch: `This branch is not taking ${data.fulfillment} orders at the moment.`,
      },
    });
  }

  const now = new Date();
  const timing = timingError(data, branchRow, now);
  if (timing) return fail("Please choose another time.", { errors: timing });

  const snapshot = await getCatalogSnapshot();
  const priced = priceCartItems(data.items, snapshot, data.branch, now);
  // Stage 8: promo codes and points become a discount here.
  const draft = draftOrder(priced, data.fulfillment);
  if (!draft.ok) {
    return fail(
      "Some items in your cart cannot be ordered right now. Please update your cart.",
      { problems: draft.problems },
    );
  }

  const productIds = new Map(snapshot.products.map((p) => [p.slug, p.id]));
  const orderId = randomUUID();
  const { totals } = draft;

  for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
    const code = generateOrderCode((max) => randomInt(max));
    try {
      // One transaction: the branch's receipt counter goes up by 1 and the
      // order takes the new value. The update locks the branch row until the
      // batch ends, so two orders at once never share a receipt number.
      await db.batch([
        db
          .update(branch)
          .set({ receiptSeq: sql`${branch.receiptSeq} + 1` })
          .where(eq(branch.id, branchRow.id)),
        db.insert(order).values({
          id: orderId,
          code,
          userId: user.id,
          branchId: branchRow.id,
          fulfillment: data.fulfillment,
          status: INITIAL_ORDER_STATUS,
          scheduledFor: data.scheduledFor,
          contactName: data.contactName,
          phone: data.phone,
          receiptEmail: data.receiptEmail,
          address: data.address,
          notes: data.note,
          subtotalCentavos: totals.subtotalCentavos,
          discountCentavos: totals.discountCentavos,
          deliveryFeeCentavos: totals.deliveryFeeCentavos,
          totalCentavos: totals.totalCentavos,
          paymentMethod: data.paymentMethod,
          paymentStatus: paymentStatusFor(data.paymentMethod),
          clientRequestId: data.clientRequestId,
          receiptNumber: sql`(select ${branch.receiptSeq} from ${branch} where ${branch.id} = ${branchRow.id})`,
        }),
        db.insert(orderItem).values(
          draft.lines.map((line, index) => ({
            id: randomUUID(),
            orderId,
            kind: line.kind,
            productId:
              line.productSlug === null
                ? null
                : (productIds.get(line.productSlug) ?? null),
            name: line.name,
            config: line.config,
            unitPriceCentavos: line.unitPriceCentavos,
            quantity: line.quantity,
            lineTotalCentavos: line.lineTotalCentavos,
            sortOrder: index,
          })),
        ),
        db.insert(orderStatusEvent).values({
          id: randomUUID(),
          orderId,
          status: INITIAL_ORDER_STATUS,
          changedByUserId: user.id,
        }),
      ]);
      // Runs after the response is sent, so the email never slows checkout
      // down. Only new orders get here: a repeated checkout returns earlier.
      after(() => sendReceiptEmail(orderId, user));
      return { ok: true, orderId };
    } catch (error) {
      const constraint = uniqueViolation(error);
      if (constraint === "order_client_request_id_unique") {
        // The same checkout finished in a parallel request.
        const sameOrder = await findPlacedOrder(user.id, data.clientRequestId);
        if (sameOrder !== null) return { ok: true, orderId: sameOrder };
      }
      if (constraint !== "order_code_unique") throw error;
    }
  }
  return fail("We could not place your order. Please try again.");
}
