import Link from "next/link";
import { AddProductButton } from "@/components/cart/add-product-button";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MenuItem } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";
import { MenuPhoto } from "./menu-photo";

/** One menu item: photo, name, price, description, status badges and actions. */
export function ProductCard({
  item,
  headingLevel = 3,
  eagerPhoto = false,
}: {
  item: MenuItem;
  /** 4 when the card sits under a drink group heading (h3). */
  headingLevel?: 3 | 4;
  /** True for the first card on the page (see MenuPhoto). */
  eagerPhoto?: boolean;
}) {
  const isSignature = item.type === "signature";
  const Heading = headingLevel === 4 ? "h4" : "h3";
  return (
    <li
      className="flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm"
      data-testid={`product-${item.slug}`}
    >
      <MenuPhoto
        src={item.imageUrl}
        dimmed={item.isSoldOut}
        eager={eagerPhoto}
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Heading className="text-lg font-bold">{item.name}</Heading>
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
          <AddProductButton
            slug={item.slug}
            name={item.name}
            disabled={item.isSoldOut}
          />
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
              // The builder starts from this recipe (/build?from=<slug>).
              <Link
                href={`/build?from=${item.slug}`}
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
      </div>
    </li>
  );
}
