"use server";

import { randomInt, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { getDb } from "@/db";
import {
  branch,
  order,
  orderItem,
  orderStatusEvent,
  pointsLedger,
  promoCode,
  user as userTable,
} from "@/db/schema";
import { siteConfig } from "@/config/site";
import { priceCartItems } from "@/lib/cart";
import { INITIAL_ORDER_STATUS } from "@/lib/order-status";
import { draftOrder, generateOrderCode, type OrderProblem } from "@/lib/orders";
import { rewardForItem, type DrinkReward } from "@/lib/points";
import { isAsapAvailable, isValidSlot } from "@/lib/schedule";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  checkoutSchema,
  paymentStatusFor,
  type CheckoutData,
} from "@/lib/validation/checkout";
import { requireUser } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";
import { resolvePromo, type ResolvedPromo } from "@/server/promos/resolve";
import { sendReceiptEmail } from "@/server/receipts/email";
import { recordOrderBadges } from "@/server/rewards/badges";

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      message: string;
      errors?: FieldErrors;
      problems?: OrderProblem[];
    };

const NOT_ENOUGH_POINTS = "You do not have enough points for this reward.";

/** How many fresh codes to try if one is already taken (very unlikely). */
const CODE_ATTEMPTS = 5;

function fail(
  message: string,
  extra: Omit<Extract<PlaceOrderResult, { ok: false }>, "ok" | "message"> = {},
): PlaceOrderResult {
  return { ok: false, message, ...extra };
}

/** The constraint name of a Postgres error with this code, or null for others. */
function violation(error: unknown, sqlState: string): string | null {
  let current: unknown = error;
  // Drizzle wraps the driver's error; the Postgres details sit in `cause`.
  for (let depth = 0; depth < 3 && current instanceof Object; depth++) {
    const e = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (e.code === sqlState) {
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
  let draft = draftOrder(priced, data.fulfillment);
  if (!draft.ok) {
    return fail(
      "Some items in your cart cannot be ordered right now. Please update your cart.",
      { problems: draft.problems },
    );
  }

  // The free drink comes off first; a promo applies to what is left.
  let reward: DrinkReward | null = null;
  if (data.redeemItemId) {
    const item = data.items.find((i) => i.id === data.redeemItemId);
    reward = item ? rewardForItem(item, snapshot) : null;
    if (!reward) {
      const message = "Please choose a drink for your reward.";
      return fail(message, { errors: { redeemItemId: message } });
    }
    const [balance] = await db
      .select({ points: userTable.pointsBalance })
      .from(userTable)
      .where(eq(userTable.id, user.id));
    if ((balance?.points ?? 0) < reward.points) {
      return fail(NOT_ENOUGH_POINTS, {
        errors: { redeemItemId: NOT_ENOUGH_POINTS },
      });
    }
  }
  const rewardCentavos = reward?.valueCentavos ?? 0;

  let promo: ResolvedPromo | null = null;
  if (data.promoCode) {
    const resolved = await resolvePromo(
      data.promoCode,
      user.id,
      draft.totals.subtotalCentavos - rewardCentavos,
      now,
    );
    if (!resolved.ok) {
      return fail(resolved.message, {
        errors: { promoCode: resolved.message },
      });
    }
    promo = resolved;
  }
  const discountCentavos = rewardCentavos + (promo?.discountCentavos ?? 0);
  if (discountCentavos > 0) {
    draft = draftOrder(priced, data.fulfillment, discountCentavos);
    /* v8 ignore next: the same items passed just above. */
    if (!draft.ok) throw new Error("The priced cart changed.");
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
          promoCodeId: promo?.id ?? null,
          pointsRedeemed: reward?.points ?? 0,
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
        ...(promo
          ? [
              db
                .update(promoCode)
                .set({ usedCount: sql`${promoCode.usedCount} + 1` })
                .where(eq(promoCode.id, promo.id)),
            ]
          : []),
        // The balance can't go below zero (a database check), so two checkouts
        // spending the same points can't both succeed.
        ...(reward
          ? [
              db
                .update(userTable)
                .set({
                  pointsBalance: sql`${userTable.pointsBalance} - ${reward.points}::int`,
                })
                .where(eq(userTable.id, user.id)),
              db.insert(pointsLedger).values({
                id: randomUUID(),
                userId: user.id,
                delta: -reward.points,
                reason: "redeem" as const,
                orderId,
              }),
            ]
          : []),
      ]);
      await recordOrderBadges(user.id, draft.lines, snapshot, now);
      // Runs after the response is sent, so the email never slows checkout
      // down. Only new orders get here: a repeated checkout returns earlier.
      after(() => sendReceiptEmail(orderId, user));
      return { ok: true, orderId };
    } catch (error) {
      const failedCheck = violation(error, "23514");
      if (failedCheck === "promo_code_within_max_uses") {
        const message = "This code has reached its limit.";
        return fail(message, { errors: { promoCode: message } });
      }
      if (failedCheck === "user_points_not_negative") {
        return fail(NOT_ENOUGH_POINTS, {
          errors: { redeemItemId: NOT_ENOUGH_POINTS },
        });
      }
      const constraint = violation(error, "23505");
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
