import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReorderButton } from "@/components/orders/reorder-button";
import { buttonVariants } from "@/components/ui/button";
import { priceCartItems, type NewCartItem } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { reorderEntry } from "@/lib/orders";
import { formatReceiptDateTime } from "@/lib/receipt";
import { requireUser } from "@/server/auth/session";
import { loadCatalog } from "@/server/catalog/queries";
import { listOrdersForUser } from "@/server/orders/queries";

export const metadata: Metadata = { title: "Your orders" };

async function OrderHistory() {
  const user = await requireUser("/orders");
  const [orders, snapshot] = await Promise.all([
    listOrdersForUser(user.id),
    loadCatalog(),
  ]);

  if (orders.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border bg-surface p-6">
        <p className="text-lg font-semibold">You have no orders yet.</p>
        <Link
          href="/menu"
          className={buttonVariants({
            size: "lg",
            className: "mt-4 h-11 px-5 font-semibold",
          })}
        >
          View the menu
        </Link>
      </div>
    );
  }

  const now = new Date();
  return (
    <ul className="mt-6 flex flex-col gap-4">
      {orders.map((order) => {
        const entries: NewCartItem[] = [];
        const unavailable: string[] = [];
        for (const item of order.items) {
          const entry = reorderEntry(item);
          const [priced] =
            entry && snapshot
              ? priceCartItems(
                  [{ ...entry, id: item.id }],
                  snapshot,
                  order.branchSlug,
                  now,
                )
              : [];
          if (entry && priced?.unitPriceCentavos != null) entries.push(entry);
          else unavailable.push(item.name);
        }
        return (
          <li
            key={order.id}
            className="flex flex-col gap-3 rounded-2xl border bg-surface p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <Link
                href={`/orders/${order.id}`}
                className="font-heading text-lg font-extrabold text-accent underline-offset-4 hover:underline"
              >
                {order.code}
              </Link>
              <span className="font-semibold">
                {formatPeso(order.totalCentavos)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {ORDER_STATUS_LABELS[order.status]} · {order.branchName} ·{" "}
              {formatReceiptDateTime(order.createdAt)}
            </p>
            <ul className="text-sm">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.name}
                </li>
              ))}
            </ul>
            <ReorderButton
              entries={entries}
              unavailable={unavailable}
              label="Reorder"
              ariaLabel={`Reorder ${order.code}`}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function OrdersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Your orders
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your orders…
          </p>
        }
      >
        <OrderHistory />
      </Suspense>
    </div>
  );
}
