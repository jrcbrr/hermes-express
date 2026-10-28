import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimit } from "@/db/schema";

export type RateLimitRule = {
  /** Window length in seconds. */
  window: number;
  /** Requests allowed per window. */
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets, when blocked. */
  retryAfter: number | null;
};

/**
 * Login and sign-up attempts per IP address: 30 per minute. Generous on
 * purpose: Philippine mobile networks put many phones behind one shared IP
 * (carrier-grade NAT), so a strict IP limit would lock out strangers.
 */
export const AUTH_IP_RATE_LIMIT: RateLimitRule = { window: 60, max: 30 };

/**
 * Login and sign-up attempts per email address: 5 per minute. This is the
 * limit that actually stops password guessing against one account.
 */
export const AUTH_EMAIL_RATE_LIMIT: RateLimitRule = { window: 60, max: 5 };

/** Turns the stored counter into an allow/deny decision. Pure, for testing. */
export function decide(
  row: { count: number; windowStart: number },
  rule: RateLimitRule,
  now: number,
): RateLimitResult {
  if (row.count <= rule.max) return { allowed: true, retryAfter: null };
  const resetsAt = row.windowStart + rule.window * 1000;
  return {
    allowed: false,
    retryAfter: Math.max(1, Math.ceil((resetsAt - now) / 1000)),
  };
}

/**
 * Records one request against `key` and reports whether it is allowed.
 * A single upsert does the check and the increment together, so concurrent
 * requests can't slip past a stale read. Matches Better Auth's
 * `customStorage.consume` shape, so the same table backs both.
 */
export async function consume(
  key: string,
  rule: RateLimitRule,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const expiredBefore = now - rule.window * 1000;
  const [row] = await getDb()
    .insert(rateLimit)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${rateLimit.windowStart} <= ${expiredBefore} then 1 else ${rateLimit.count} + 1 end`,
        windowStart: sql`case when ${rateLimit.windowStart} <= ${expiredBefore} then ${now} else ${rateLimit.windowStart} end`,
      },
    })
    .returning({ count: rateLimit.count, windowStart: rateLimit.windowStart });

  if (!row) return { allowed: true, retryAfter: null };
  return decide(row, rule, now);
}
