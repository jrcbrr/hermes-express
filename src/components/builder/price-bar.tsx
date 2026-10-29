import { ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import type { DrinkPrice } from "@/lib/pricing";
import { formatPeso, multiplyCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/** The live price. Tapping it opens a line-by-line breakdown. */
export function PriceBar({
  price,
  quantity,
}: {
  price: DrinkPrice | null;
  quantity: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (price === null) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        Choose a base to see the price.
      </p>
    );
  }

  const total = multiplyCentavos(price.unitPriceCentavos, quantity);
  return (
    <div>
      {open ? (
        <ul
          id={panelId}
          aria-label="Price breakdown"
          className="mb-2 max-h-48 overflow-y-auto border-b pb-2 text-sm"
        >
          {price.lines.map((line) => (
            <li
              key={`${line.kind}-${line.slug}`}
              className="flex justify-between gap-4 py-0.5"
            >
              <span>
                {line.name}
                {line.quantity > 1 ? ` × ${line.quantity}` : ""}
              </span>
              <span className="tabular-nums">{formatPeso(line.centavos)}</span>
            </li>
          ))}
          {quantity > 1 ? (
            <li className="flex justify-between gap-4 py-0.5 font-semibold">
              <span>
                {formatPeso(price.unitPriceCentavos)} × {quantity} cups
              </span>
              <span className="tabular-nums">{formatPeso(total)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="text-sm text-muted-foreground">
          {open ? "Hide price details" : "Show price details"}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="text-lg font-bold tabular-nums"
            data-testid="live-price"
          >
            {formatPeso(total)}
          </span>
          <ChevronUp
            aria-hidden="true"
            className={cn("size-4 transition-transform", !open && "rotate-180")}
          />
        </span>
      </button>
    </div>
  );
}
