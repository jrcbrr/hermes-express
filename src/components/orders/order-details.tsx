import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ReceiptView } from "@/components/receipts/receipt-view";
import { formatPeso } from "@/lib/money";
import { buildReceipt } from "@/lib/receipt";
import { formatSlot } from "@/lib/schedule";
import { PAYMENT_METHOD_LABELS } from "@/lib/validation/checkout";
import { requireUser } from "@/server/auth/session";
import { getOrderForUser, trackingForOrder } from "@/server/orders/queries";
import { OrderTracker } from "./order-tracker";

/** A placed order: its code, live tracker, items, totals and receipt. */
export async function OrderDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const found = await getOrderForUser(id, user);
  if (!found) notFound();
  const tracking = await trackingForOrder(found);
  const isOwner = found.userId === user.id;

  const now = new Date();
  const when =
    found.scheduledFor === null
      ? "As soon as possible"
      : formatSlot(found.scheduledFor, now);

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section
        aria-labelledby="order-code-heading"
        className="flex flex-col items-start gap-2 rounded-2xl border bg-surface p-6"
      >
        {isOwner ? (
          <p className="flex items-center gap-2 font-semibold text-primary">
            <CircleCheck className="size-5" aria-hidden="true" />
            Thank you. Your order has been placed.
          </p>
        ) : null}
        <h2
          id="order-code-heading"
          className="font-heading text-4xl font-extrabold tracking-wide"
          data-testid="order-code"
        >
          {found.code}
        </h2>
        <p className="text-muted-foreground">
          Please mention this code at the counter or to your rider.
        </p>
      </section>

      <section
        aria-label="Order progress"
        className="rounded-2xl border bg-surface p-6"
      >
        <OrderTracker orderId={found.id} initial={tracking} />
      </section>

      <section
        aria-labelledby="order-info-heading"
        className="rounded-2xl border bg-surface p-6"
      >
        <h2
          id="order-info-heading"
          className="font-heading text-xl font-extrabold"
        >
          Details
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">
            {found.fulfillment === "pickup" ? "Pickup at" : "Delivery from"}
          </dt>
          <dd>
            {found.branchName}, {found.branchAddress}
          </dd>
          {found.address ? (
            <>
              <dt className="font-semibold">Deliver to</dt>
              <dd>{found.address}</dd>
            </>
          ) : null}
          <dt className="font-semibold">When</dt>
          <dd>{when}</dd>
          <dt className="font-semibold">Contact</dt>
          <dd>
            {found.contactName} · {found.phone}
          </dd>
          {found.notes ? (
            <>
              <dt className="font-semibold">Note</dt>
              <dd>{found.notes}</dd>
            </>
          ) : null}
          <dt className="font-semibold">Payment</dt>
          <dd>
            {PAYMENT_METHOD_LABELS[found.paymentMethod]} ·{" "}
            {found.paymentStatus === "demo_paid"
              ? "Paid (demo)"
              : found.paymentMethod === "cash_pickup"
                ? "Pay at the counter"
                : "Pay when your order arrives"}
          </dd>
        </dl>
      </section>

      <section
        aria-labelledby="order-items-heading"
        className="rounded-2xl border bg-surface p-6"
      >
        <h2
          id="order-items-heading"
          className="font-heading text-xl font-extrabold"
        >
          Items
        </h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          {found.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-semibold">
                  {item.quantity} × {item.name}
                </span>
                {item.config.details.length > 0 ? (
                  <span className="block text-muted-foreground">
                    {item.config.details.join(" · ")}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatPeso(item.lineTotalCentavos)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right tabular-nums">
            {formatPeso(found.subtotalCentavos)}
          </dd>
          {found.discountCentavos > 0 ? (
            <>
              <dt>Discount{found.promoCode ? ` (${found.promoCode})` : ""}</dt>
              <dd className="text-right tabular-nums">
                −{formatPeso(found.discountCentavos)}
              </dd>
            </>
          ) : null}
          {found.fulfillment === "delivery" ? (
            <>
              <dt>Delivery fee</dt>
              <dd className="text-right tabular-nums">
                {found.deliveryFeeCentavos === 0
                  ? "Free"
                  : formatPeso(found.deliveryFeeCentavos)}
              </dd>
            </>
          ) : null}
          <dt className="mt-2 text-base font-bold">Total</dt>
          <dd className="mt-2 text-right text-base font-bold tabular-nums">
            {formatPeso(found.totalCentavos)}
          </dd>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          This is a demo order. No real payment was made.
        </p>
      </section>

      <details open className="rounded-2xl border bg-surface p-6">
        <summary className="cursor-pointer font-heading text-xl font-extrabold">
          Receipt
        </summary>
        <div className="mt-4">
          <ReceiptView receipt={buildReceipt(found)} />
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/receipts/${found.id}`}
          className={buttonVariants({
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          View receipt
        </Link>
        <Link
          href="/menu"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          Back to the menu
        </Link>
      </div>
    </div>
  );
}
