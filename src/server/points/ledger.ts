import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export type PointsAdjustment = {
  userId: string;
  delta: number;
  note: string;
};

/**
 * An admin's adjustment: the balance and its ledger row, in one statement. It
 * matches nothing, and writes nothing, if the balance would go below zero or
 * the account doesn't exist. False in that case.
 */
export async function recordPointsAdjustment({
  userId,
  delta,
  note,
}: PointsAdjustment): Promise<boolean> {
  const result = await getDb().execute(sql`
    with changed as (
      update "user"
      set points_balance = points_balance + ${delta}::int
      where id = ${userId} and points_balance + ${delta}::int >= 0
      returning id
    )
    insert into points_ledger (id, user_id, delta, reason, note)
    select ${randomUUID()}::text, id, ${delta}::int, 'admin_adjust', ${note}::text
    from changed
    returning id`);
  return result.rows.length > 0;
}
