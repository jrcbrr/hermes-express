import { LogoMark } from "@/components/brand/logo-mark";
import { formatPeso } from "@/lib/money";
import type { Receipt } from "@/lib/receipt";

/** A receipt laid out like a shop receipt (docs/PLAN.md §7, "Receipts"). */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const { shop, customer, totals, payment, footer } = receipt;
  return (
    <article
      aria-labelledby="receipt-heading"
      className="rounded-2xl border bg-surface p-6 text-sm print:border-0 print:p-0"
    >
      <header className="flex flex-col items-center gap-1 border-b border-dashed pb-4 text-center">
        <LogoMark className="size-10 text-primary" />
        <h2
          id="receipt-heading"
          className="font-heading text-xl font-extrabold"
        >
          {shop.name}
        </h2>
        <p>
          {shop.branchName} · {shop.address}
        </p>
        <p>Phone {shop.phone}</p>
        <p>TIN {shop.tin}</p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-dashed py-4">
        <dt className="font-semibold">Receipt no.</dt>
        <dd data-testid="receipt-number">{receipt.number}</dd>
        <dt className="font-semibold">Order code</dt>
        <dd>{receipt.orderCode}</dd>
        <dt className="font-semibold">Date</dt>
        <dd>{receipt.issuedAt}</dd>
        <dt className="font-semibold">{receipt.fulfillment}</dt>
        <dd>{receipt.timing}</dd>
        <dt className="font-semibold">Customer</dt>
        <dd>{customer.name}</dd>
        <dt className="font-semibold">Phone</dt>
        <dd>{customer.phone}</dd>
        <dt className="font-semibold">Email</dt>
        <dd className="break-all">{customer.email}</dd>
        {customer.address ? (
          <>
            <dt className="font-semibold">Deliver to</dt>
            <dd>{customer.address}</dd>
          </>
        ) : null}
      </dl>

      <table className="w-full border-b border-dashed">
        <caption className="sr-only">Items</caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="py-2 font-medium">
              Item
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Price
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line) => (
            <tr key={line.id} className="align-top">
              <td className="py-1.5">
                <span className="font-semibold">{line.name}</span>
                {line.details ? (
                  <span className="block text-muted-foreground">
                    {line.details}
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {line.quantity}
              </td>
              <td className="py-1.5 pl-3 text-right tabular-nums">
                {formatPeso(line.unitPriceCentavos)}
              </td>
              <td className="py-1.5 pl-3 text-right tabular-nums">
                {formatPeso(line.lineTotalCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-dashed py-4">
        <dt>Subtotal</dt>
        <dd className="text-right tabular-nums">
          {formatPeso(totals.subtotalCentavos)}
        </dd>
        {totals.discountCentavos > 0 ? (
          <>
            <dt>Discount{totals.promoCode ? ` (${totals.promoCode})` : ""}</dt>
            <dd className="text-right tabular-nums">
              −{formatPeso(totals.discountCentavos)}
            </dd>
          </>
        ) : null}
        {totals.deliveryFeeCentavos !== null ? (
          <>
            <dt>Delivery fee</dt>
            <dd className="text-right tabular-nums">
              {totals.deliveryFeeCentavos === 0
                ? "Free"
                : formatPeso(totals.deliveryFeeCentavos)}
            </dd>
          </>
        ) : null}
        <dt className="mt-1 text-base font-bold">Total</dt>
        <dd
          className="mt-1 text-right text-base font-bold tabular-nums"
          data-testid="receipt-total"
        >
          {formatPeso(totals.totalCentavos)}
        </dd>
        <dt className="mt-2 text-muted-foreground">VATable sales</dt>
        <dd className="mt-2 text-right text-muted-foreground tabular-nums">
          {formatPeso(totals.vatableSalesCentavos)}
        </dd>
        <dt className="text-muted-foreground">VAT (12%)</dt>
        <dd className="text-right text-muted-foreground tabular-nums">
          {formatPeso(totals.vatCentavos)}
        </dd>
      </dl>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-dashed py-4">
        <dt className="font-semibold">Payment</dt>
        <dd>{payment.method}</dd>
        <dt className="font-semibold">Status</dt>
        <dd>{payment.status}</dd>
      </dl>

      <footer className="flex flex-col items-center gap-1 pt-4 text-center">
        <p className="font-semibold">{footer.thanks}</p>
        <p className="text-muted-foreground">{footer.tagline}</p>
        <p className="mt-2 text-xs font-semibold tracking-wide uppercase">
          {footer.notice}
        </p>
      </footer>
    </article>
  );
}
