// The one place an order's status is written. Callers check who is asking and
// canTransition() first.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { OrderStatus } from "@/lib/order-status";
import { CENTAVOS_PER_POINT } from "@/lib/points";

/** Completed: credit the points, once per order (a unique index guards this). */
function earnPoints() {
  return sql`, earned as (
      insert into points_ledger (id, user_id, delta, reason, order_id)
      select ${randomUUID()}::text, user_id,
        (subtotal_centavos - discount_centavos) / ${CENTAVOS_PER_POINT}::int,
        'earn', id
      from moved
      where subtotal_centavos - discount_centavos >= ${CENTAVOS_PER_POINT}::int
      on conflict do nothing
      returning user_id, delta
    ), credited as (
      update "user" as u
      set points_balance = u.points_balance + earned.delta
      from earned
      where u.id = earned.user_id
    )`;
}

/** Cancelled: give back the promo use and any points redeemed. */
function returnDiscounts() {
  return sql`, freed as (
      update promo_code
      set used_count = greatest(used_count - 1, 0)
      where id in (select promo_code_id from moved)
    ), refunded as (
      insert into points_ledger (id, user_id, delta, reason, order_id, note)
      select ${randomUUID()}::text, user_id, points_redeemed, 'redeem', id,
        'Returned from a cancelled order'
      from moved
      where points_redeemed > 0
      returning user_id, delta
    ), credited as (
      update "user" as u
      set points_balance = u.points_balance + refunded.delta
      from refunded
      where u.id = refunded.user_id
    )`;
}

/**
 * Moves an order and records who did it. False when the order had already
 * moved on.
 *
 * One statement, so every write succeeds together. The update only matches
 * while the status is still `from`: when two staff tap at once, the second
 * matches nothing, so no event is written and no points move twice.
 */
export async function writeOrderTransition({
  orderId,
  from,
  to,
  changedByUserId,
}: {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  changedByUserId: string;
}): Promise<boolean> {
  const effects =
    to === "completed"
      ? earnPoints()
      : to === "cancelled"
        ? returnDiscounts()
        : sql``;
  const result = await getDb().execute(sql`
    with moved as (
      update "order"
      set status = ${to}, updated_at = now()
      where id = ${orderId} and status = ${from}
      returning id, user_id, promo_code_id, points_redeemed,
        subtotal_centavos, discount_centavos
    )${effects}
    insert into order_status_event (id, order_id, status, changed_by_user_id)
    select ${randomUUID()}::text, id, ${to}::text, ${changedByUserId}::text from moved
    returning id`);
  return result.rows.length > 0;
}
