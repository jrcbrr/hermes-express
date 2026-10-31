// Finds a promo code and checks it for one customer. Used by the checkout
// preview and, as the real check, by placeOrder.
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { order, promoCode } from "@/db/schema";
import {
  evaluatePromo,
  normalizePromoCode,
  PROMO_NOT_FOUND,
} from "@/lib/promos";

export type ResolvedPromo = {
  ok: true;
  id: string;
  code: string;
  discountCentavos: number;
};

export async function resolvePromo(
  rawCode: string,
  userId: string,
  subtotalCentavos: number,
  now: Date,
): Promise<ResolvedPromo | { ok: false; message: string }> {
  const code = normalizePromoCode(rawCode);
  const db = getDb();
  const [promo] = await db
    .select()
    .from(promoCode)
    .where(eq(promoCode.code, code));
  if (!promo) return { ok: false, message: PROMO_NOT_FOUND };

  // A cancelled order doesn't use up a first-order code.
  const prior = promo.firstOrderOnly
    ? await db
        .select({ id: order.id })
        .from(order)
        .where(and(eq(order.userId, userId), ne(order.status, "cancelled")))
    : [];
  const result = evaluatePromo(promo, {
    subtotalCentavos,
    hasPriorOrders: prior.length > 0,
    now,
  });
  return result.ok
    ? {
        ok: true,
        id: promo.id,
        code,
        discountCentavos: result.discountCentavos,
      }
    : result;
}
