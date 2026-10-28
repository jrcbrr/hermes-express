import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MenuItem } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";

/** One menu item: name, price, description, status badges and actions. */
export function ProductCard({ item }: { item: MenuItem }) {
  const isSignature = item.type === "signature";
  return (
    <li
      className="flex flex-col rounded-2xl border bg-surface p-5 shadow-sm"
      data-testid={`product-${item.slug}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{item.name}</h3>
        <p className="shrink-0 font-semibold">
          {formatPeso(item.priceCentavos)}
        </p>
      </div>
      {item.isSeasonal || item.isSoldOut ? (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Status">
          {item.isSeasonal ? (
            <li className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              Seasonal
            </li>
          ) : null}
          {item.isSoldOut ? (
            <li className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold">
              Sold out at this branch
            </li>
          ) : null}
        </ul>
      ) : null}
      <p className="mt-2 flex-1 text-sm text-muted-foreground">
        {item.description}
      </p>
      <div className="mt-5 flex gap-2">
        {/* Add to cart is wired up in Stage 5 (checkout). */}
        <Button
          size="lg"
          className="h-11 flex-1 font-semibold"
          disabled
          aria-label={`Add ${item.name} to cart`}
        >
          Add to cart
        </Button>
        {isSignature ? (
          item.isSoldOut ? (
            <Button
              variant="outline"
              size="lg"
              className="h-11 flex-1 font-semibold"
              disabled
              aria-label={`Customize ${item.name}`}
            >
              Customize
            </Button>
          ) : (
            // The builder reads ?drink= to start from this recipe (Stage 4).
            <Link
              href={`/build?drink=${item.slug}`}
              aria-label={`Customize ${item.name}`}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-11 flex-1 font-semibold",
              })}
            >
              Customize
            </Link>
          )
        ) : null}
      </div>
    </li>
  );
}
