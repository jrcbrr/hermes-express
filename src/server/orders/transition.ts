// The one place an order's status is written. Callers check who is asking and
// canTransition() first.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { OrderStatus } from "@/lib/order-status";

/**
 * Moves an order and records who did it. False when the order had already
 * moved on.
 *
 * One statement, so the two writes succeed together. The update only matches
 * while the status is still `from`: when two staff tap at once, the second
 * matches nothing and writes no event.
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
  const result = await getDb().execute(sql`
    with moved as (
      update "order"
      set status = ${to}, updated_at = now()
      where id = ${orderId} and status = ${from}
      returning id
    )
    insert into order_status_event (id, order_id, status, changed_by_user_id)
    select ${randomUUID()}::text, id, ${to}::text, ${changedByUserId}::text from moved
    returning id`);
  return result.rows.length > 0;
}
