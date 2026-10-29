import Link from "next/link";
import type { PricedCartItem } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import type { CartTotals } from "@/lib/pricing";

/** The items and totals beside the checkout form. */
export function OrderSummary({
  priced,
  totals,
  fulfillment,
}: {
  priced: PricedCartItem[];
  totals: CartTotals;
  fulfillment: "pickup" | "delivery";
}) {
  return (
    <section
      aria-labelledby="order-summary-heading"
      className="flex h-fit flex-col gap-4 rounded-2xl border bg-surface p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="order-summary-heading"
          className="font-heading text-xl font-extrabold"
        >
          Your order
        </h2>
        <Link
          href="/cart"
          className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Edit cart
        </Link>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {priced.map((line) => (
          <li key={line.item.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="font-semibold">
                {line.item.quantity} × {line.name}
              </span>
              {line.details.length > 0 ? (
                <span className="block text-muted-foreground">
                  {line.details.join(" · ")}
                </span>
              ) : null}
              {line.problem ? (
                <span className="block text-danger">{line.problem}</span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums">
              {line.lineTotalCentavos === null
                ? "Unavailable"
                : formatPeso(line.lineTotalCentavos)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 text-sm">
        <dt>Subtotal</dt>
        <dd className="text-right tabular-nums">
          {formatPeso(totals.subtotalCentavos)}
        </dd>
        {/* Stage 8: promo discount and points lines go here. */}
        <dt>Delivery fee</dt>
        <dd className="text-right tabular-nums" data-testid="delivery-fee">
          {fulfillment === "pickup"
            ? "Pickup"
            : totals.deliveryFeeCentavos === 0
              ? "Free"
              : formatPeso(totals.deliveryFeeCentavos)}
        </dd>
        <dt className="mt-2 text-base font-bold">Total</dt>
        <dd
          className="mt-2 text-right text-base font-bold tabular-nums"
          data-testid="checkout-total"
        >
          {formatPeso(totals.totalCentavos)}
        </dd>
      </dl>
    </section>
  );
}
