import { LogoMark } from "@/components/brand/logo-mark";
import { formatAmount, formatPesoPlain } from "@/lib/money";
import type { Receipt, ReceiptAmountRow, ReceiptRow } from "@/lib/receipt";

const RULE = "border-t border-dashed border-foreground/40";

function Row({ label, value, testId }: ReceiptRow & { testId?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="min-w-0 text-right break-words" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

function AmountRow(row: ReceiptAmountRow) {
  return (
    <Row
      label={row.label}
      value={"text" in row ? row.text : formatAmount(row.centavos)}
    />
  );
}

/**
 * A receipt laid out like a printed Philippine sales receipt (docs/PLAN.md
 * §7, "Receipts"): one monospaced column, dashed rules, plain amounts.
 */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const { header, total, payment, footer } = receipt;
  return (
    <article
      aria-labelledby="receipt-heading"
      className="mx-auto w-full max-w-sm rounded-sm border bg-surface px-5 py-6 font-mono text-[13px] leading-relaxed text-foreground shadow-sm print:max-w-none print:border-0 print:shadow-none"
    >
      <header className="flex flex-col items-center text-center">
        <LogoMark className="mb-1 size-8" />
        {/* Headings use the brand font site-wide; a receipt stays monospaced. */}
        <h2 id="receipt-heading" className="font-mono text-base font-bold">
          {header.shopName}
        </h2>
        <p>{header.branch}</p>
        <p>{header.phone}</p>
        <p>{header.tin}</p>
        <p className="mt-3 font-bold tracking-widest">{header.title}</p>
      </header>

      <dl className={`mt-3 py-2 ${RULE}`} data-testid="receipt-details">
        {receipt.details.map((row) => (
          <Row
            key={row.label}
            {...row}
            testId={row.value === receipt.number ? "receipt-number" : undefined}
          />
        ))}
      </dl>

      <table className={`w-full ${RULE}`}>
        <caption className="sr-only">Items</caption>
        <thead>
          <tr>
            <th scope="col" className="w-8 pt-2 text-left font-normal">
              QTY
            </th>
            <th scope="col" className="pt-2 text-left font-normal">
              DESCRIPTION
            </th>
            <th scope="col" className="pt-2 text-right font-normal">
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line) => (
            <tr key={line.id} className="align-top">
              <td className="pt-1">{line.quantity}</td>
              <td className="pt-1">
                {line.description}
                <span className="block text-muted-foreground">
                  @{formatAmount(line.unitPriceCentavos)}
                  {line.details ? ` ${line.details}` : ""}
                </span>
              </td>
              <td className="pt-1 text-right">
                {formatAmount(line.lineTotalCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className={`mt-2 py-2 ${RULE}`}>
        {receipt.amounts.map((row) => (
          <AmountRow key={row.label} {...row} />
        ))}
        <div className="mt-1 flex justify-between gap-4 font-bold">
          <dt>{total.label}</dt>
          <dd data-testid="receipt-total">{formatPesoPlain(total.centavos)}</dd>
        </div>
      </dl>

      <dl className={`py-2 ${RULE}`} data-testid="receipt-vat">
        {receipt.vat.map((row) => (
          <AmountRow key={row.label} {...row} />
        ))}
      </dl>

      <dl className={`py-2 ${RULE}`}>
        <Row {...payment} />
        <div className="mt-2">
          {receipt.soldTo.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </div>
      </dl>

      <footer className={`pt-3 text-center ${RULE}`}>
        <p>{footer.thanks}</p>
        <p className="text-muted-foreground">{footer.tagline}</p>
        <p className="mt-2 font-bold">{footer.notice}</p>
      </footer>
    </article>
  );
}
