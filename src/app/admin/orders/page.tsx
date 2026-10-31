import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import {
  AdminHeading,
  controlClass,
  linkClass,
  Pager,
} from "@/components/admin/admin-ui";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseOrderFilters } from "@/lib/admin";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { formatReceiptDateTime } from "@/lib/receipt";
import { requireRole } from "@/server/auth/session";
import { listAdminOrders, listBranches } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin orders" };

async function OrdersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  await requireRole(["admin"], "/admin/orders");
  const filters = parseOrderFilters(await searchParams);
  const [branches, { rows, hasMore }] = await Promise.all([
    listBranches(),
    listAdminOrders(filters),
  ]);

  return (
    <>
      <Form
        action="/admin/orders"
        key={`${filters.branch}-${filters.status}-${filters.date}`}
        className="mt-6 grid gap-3 sm:grid-cols-4 sm:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-branch">Branch</Label>
          <select
            id="filter-branch"
            name="branch"
            defaultValue={filters.branch ?? ""}
            className={controlClass}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={controlClass}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-date">Date</Label>
          <input
            id="filter-date"
            name="date"
            type="date"
            defaultValue={filters.date ?? ""}
            className={controlClass}
          />
        </div>
        <Button type="submit" size="lg" className="h-11">
          Apply filters
        </Button>
      </Form>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No orders match these filters.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((o) => (
            <li
              key={o.id}
              className="grid gap-3 rounded-xl border bg-surface p-4 md:grid-cols-[1fr_14rem] md:items-center"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <Link href={`/orders/${o.id}`} className={linkClass}>
                    {o.code}
                  </Link>
                  <span className="font-semibold">
                    {formatPeso(o.totalCentavos)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {o.branchName} ·{" "}
                  {o.fulfillment === "pickup" ? "Pickup" : "Delivery"} ·{" "}
                  {o.contactName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatReceiptDateTime(o.createdAt)}
                </p>
              </div>
              <OrderStatusSelect
                orderId={o.id}
                code={o.code}
                status={o.status}
                fulfillment={o.fulfillment}
              />
            </li>
          ))}
        </ul>
      )}
      <Pager
        path="/admin/orders"
        params={{
          branch: filters.branch,
          status: filters.status,
          date: filters.date,
        }}
        page={filters.page}
        hasMore={hasMore}
      />
    </>
  );
}

export default function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  return (
    <>
      <AdminHeading title="Orders" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading orders…
          </p>
        }
      >
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
