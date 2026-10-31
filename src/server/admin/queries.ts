// Reads for the admin pages. Every page calls requireRole(["admin"]) first.
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import { branch, order, user } from "@/db/schema";
import {
  ADMIN_PAGE_SIZE,
  buildSalesSummary,
  escapeLike,
  manilaDateString,
  manilaDayRange,
  phoneSearchTerm,
  type OrderFilters,
  type SalesSummary,
} from "@/lib/admin";

export async function listBranches() {
  return getDb()
    .select({ id: branch.id, slug: branch.slug, name: branch.name })
    .from(branch)
    .orderBy(asc(branch.name));
}

/**
 * Today's sales per branch (Manila day). Cancelled orders don't count; cash
 * orders do, since they are sales even before the money is collected.
 */
export async function getTodaySummary(now: Date): Promise<SalesSummary> {
  const today = manilaDayRange(manilaDateString(now));
  /* v8 ignore next: manilaDateString always gives a real date. */
  if (!today) throw new RangeError("Invalid date");
  const rows = await getDb()
    .select({
      slug: branch.slug,
      name: branch.name,
      orders: count(order.id),
      revenueCentavos:
        sql<number>`coalesce(sum(${order.totalCentavos}), 0)`.mapWith(Number),
    })
    .from(branch)
    .leftJoin(
      order,
      and(
        eq(order.branchId, branch.id),
        gte(order.createdAt, today.start),
        lte(order.createdAt, today.end),
        ne(order.status, "cancelled"),
      ),
    )
    .groupBy(branch.id, branch.slug, branch.name)
    .orderBy(asc(branch.name));
  return buildSalesSummary(rows);
}

export type AdminOrderRow = Awaited<
  ReturnType<typeof listAdminOrders>
>["rows"][number];

/** One page of orders, newest first. Fetches one extra to know if more follow. */
export async function listAdminOrders(filters: OrderFilters) {
  const range = filters.date ? manilaDayRange(filters.date) : null;
  const rows = await getDb()
    .select({
      id: order.id,
      code: order.code,
      status: order.status,
      fulfillment: order.fulfillment,
      contactName: order.contactName,
      totalCentavos: order.totalCentavos,
      createdAt: order.createdAt,
      branchName: branch.name,
    })
    .from(order)
    .innerJoin(branch, eq(order.branchId, branch.id))
    .where(
      and(
        filters.branch ? eq(branch.slug, filters.branch) : undefined,
        filters.status ? eq(order.status, filters.status) : undefined,
        range ? gte(order.createdAt, range.start) : undefined,
        range ? lte(order.createdAt, range.end) : undefined,
      ),
    )
    .orderBy(desc(order.createdAt))
    .limit(ADMIN_PAGE_SIZE + 1)
    .offset((filters.page - 1) * ADMIN_PAGE_SIZE);
  return {
    rows: rows.slice(0, ADMIN_PAGE_SIZE),
    hasMore: rows.length > ADMIN_PAGE_SIZE,
  };
}

/** One page of accounts matching a name, email or phone, by name. */
export async function listUsers(search: string, page: number) {
  const term = search.trim();
  const pattern = `%${escapeLike(term)}%`;
  const phone = phoneSearchTerm(term);
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      pointsBalance: user.pointsBalance,
    })
    .from(user)
    .where(
      term
        ? or(
            ilike(user.name, pattern),
            ilike(user.email, pattern),
            ilike(user.phone, phone ? `${escapeLike(phone)}%` : pattern),
          )
        : undefined,
    )
    .orderBy(asc(user.name), asc(user.id))
    .limit(ADMIN_PAGE_SIZE + 1)
    .offset((page - 1) * ADMIN_PAGE_SIZE);
  return {
    rows: rows.slice(0, ADMIN_PAGE_SIZE),
    hasMore: rows.length > ADMIN_PAGE_SIZE,
  };
}

/** An account and its orders, newest first, or null. No password data is read. */
export async function getUserWithOrders(id: string) {
  const db = getDb();
  const [found] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
      pointsBalance: user.pointsBalance,
      defaultAddress: user.defaultAddress,
    })
    .from(user)
    .where(eq(user.id, id));
  if (!found) return null;
  const orders = await db
    .select({
      id: order.id,
      code: order.code,
      status: order.status,
      totalCentavos: order.totalCentavos,
      createdAt: order.createdAt,
      branchName: branch.name,
    })
    .from(order)
    .innerJoin(branch, eq(order.branchId, branch.id))
    .where(eq(order.userId, id))
    .orderBy(desc(order.createdAt));
  return { ...found, orders };
}
