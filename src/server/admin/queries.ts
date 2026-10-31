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
import { branch, order, orderItem, promoCode, user } from "@/db/schema";
import {
  ADMIN_PAGE_SIZE,
  buildSalesSummary,
  escapeLike,
  fillRevenueDays,
  lastManilaDays,
  manilaDateString,
  manilaDayRange,
  phoneSearchTerm,
  SALES_CHART_DAYS,
  TOP_ITEMS_LIMIT,
  type OrderFilters,
  type SalesCharts,
  type SalesSummary,
} from "@/lib/admin";
import { MANILA_TIME_ZONE } from "@/lib/schedule";

/** Every promo code, newest first. */
export async function listPromos() {
  return getDb().select().from(promoCode).orderBy(desc(promoCode.createdAt));
}

export async function getPromo(id: string) {
  const [found] = await getDb()
    .select()
    .from(promoCode)
    .where(eq(promoCode.id, id));
  return found ?? null;
}

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

/**
 * The dashboard charts, on the same rules as the summary cards. Built drinks
 * count together as "Custom drinks": their names are the customers' own.
 */
export async function getSalesCharts(now: Date): Promise<SalesCharts> {
  const days = lastManilaDays(now, SALES_CHART_DAYS);
  const first = manilaDayRange(days[0]!);
  /* v8 ignore next: manilaDateString always gives a real date. */
  if (!first) throw new RangeError("Invalid date");
  const inPeriod = and(
    gte(order.createdAt, first.start),
    lte(order.createdAt, now),
    ne(order.status, "cancelled"),
  );
  const db = getDb();

  const manilaDay = sql<string>`to_char(${order.createdAt} at time zone ${MANILA_TIME_ZONE}, 'YYYY-MM-DD')`;
  const itemName = sql<string>`case when ${orderItem.kind} = 'custom' then 'Custom drinks' else ${orderItem.name} end`;
  const quantity = sql<number>`coalesce(sum(${orderItem.quantity}), 0)`.mapWith(
    Number,
  );

  const [revenue, branches, items] = await Promise.all([
    db
      .select({
        day: manilaDay,
        revenueCentavos:
          sql<number>`coalesce(sum(${order.totalCentavos}), 0)`.mapWith(Number),
      })
      .from(order)
      .where(inPeriod)
      // By position: the time zone is a query parameter, so Postgres would not
      // see two copies of this expression as the same one.
      .groupBy(sql`1`),
    db
      .select({ name: branch.name, orders: count(order.id) })
      .from(branch)
      .leftJoin(order, and(eq(order.branchId, branch.id), inPeriod))
      .groupBy(branch.id, branch.name)
      .orderBy(asc(branch.name)),
    db
      .select({ name: itemName, quantity })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .where(inPeriod)
      .groupBy(sql`1`)
      .orderBy(desc(quantity), asc(itemName))
      .limit(TOP_ITEMS_LIMIT),
  ]);

  return {
    revenueByDay: fillRevenueDays(days, revenue),
    ordersByBranch: branches,
    topItems: items,
  };
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
