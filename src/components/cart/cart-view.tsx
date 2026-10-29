"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Stepper } from "@/components/builder/stepper";
import { BranchPicker } from "@/components/menu/branch-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { priceCartItems, type PricedCartItem } from "@/lib/cart";
import { branchCookieString, type CatalogSnapshot } from "@/lib/catalog";
import { formatPeso, sumCentavos } from "@/lib/money";
import {
  DELIVERY_FEE_CENTAVOS,
  FREE_DELIVERY_MIN_CENTAVOS,
  MAX_LINE_QUANTITY,
} from "@/lib/pricing";
import { cartStore, useCart } from "./cart-store";

/** The cart page: items, quantities, edit and remove, and the subtotal. */
export function CartView({
  snapshot,
  initialBranch,
  now,
}: {
  snapshot: CatalogSnapshot;
  initialBranch: string;
  now: Date;
}) {
  const { ready, cart } = useCart();
  const [branch, setBranch] = useState(initialBranch);

  if (!ready) {
    return (
      <p role="status" className="mt-6 text-muted-foreground">
        Loading your cart…
      </p>
    );
  }
  if (cart.items.length === 0) return <EmptyCart />;

  const priced = priceCartItems(cart.items, snapshot, branch, now);
  const subtotal = sumCentavos(priced.map((p) => p.lineTotalCentavos ?? 0));
  const hasProblems = priced.some((p) => p.problem !== null);
  const toFreeDelivery = FREE_DELIVERY_MIN_CENTAVOS - subtotal;

  function chooseBranch(slug: string) {
    setBranch(slug);
    document.cookie = branchCookieString(
      slug,
      window.location.protocol === "https:",
    );
  }

  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <BranchPicker selected={branch} onSelect={chooseBranch} />
        <ul aria-label="Items in your cart" className="flex flex-col gap-4">
          {priced.map((line) => (
            <CartLine key={line.item.id} line={line} />
          ))}
        </ul>
      </div>

      <section
        aria-labelledby="cart-summary-heading"
        className="flex h-fit flex-col gap-4 rounded-2xl border bg-surface p-5 md:sticky md:top-24"
      >
        <h2
          id="cart-summary-heading"
          className="font-heading text-xl font-extrabold"
        >
          Order summary
        </h2>
        <dl className="flex justify-between text-lg font-bold">
          <dt>Subtotal</dt>
          <dd className="tabular-nums" data-testid="cart-subtotal">
            {formatPeso(subtotal)}
          </dd>
        </dl>
        <p className="text-sm text-muted-foreground">
          Pickup is free. Delivery is {formatPeso(DELIVERY_FEE_CENTAVOS)}, and
          free for orders of {formatPeso(FREE_DELIVERY_MIN_CENTAVOS)} or more
          {toFreeDelivery > 0
            ? ` (${formatPeso(toFreeDelivery)} to go).`
            : ". Your order qualifies."}
        </p>
        {hasProblems ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
          >
            Some items cannot be ordered from this branch. Please change the
            branch, or edit or remove those items, before checking out.
          </p>
        ) : null}
        {hasProblems ? (
          <Button size="lg" className="h-11 font-semibold" disabled>
            Proceed to checkout
          </Button>
        ) : (
          <Link
            href="/checkout"
            className={buttonVariants({
              size: "lg",
              className: "h-11 font-semibold",
            })}
          >
            Proceed to checkout
          </Link>
        )}
        <Link
          href="/menu"
          className="text-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Continue browsing
        </Link>
      </section>
    </div>
  );
}

function CartLine({ line }: { line: PricedCartItem }) {
  const { item } = line;
  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border bg-surface p-4"
      data-testid="cart-item"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{line.name}</h3>
          {line.details.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {line.details.join(" · ")}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 font-semibold tabular-nums">
          {line.lineTotalCentavos === null
            ? "Unavailable"
            : formatPeso(line.lineTotalCentavos)}
        </p>
      </div>
      {line.problem ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm"
        >
          {line.problem}
        </p>
      ) : null}
      <Stepper
        label={
          line.unitPriceCentavos === null
            ? "Quantity"
            : `Quantity (${formatPeso(line.unitPriceCentavos)} each)`
        }
        unit={item.kind === "custom" ? "cup" : "piece"}
        value={item.quantity}
        min={1}
        max={MAX_LINE_QUANTITY}
        onChange={(value) => cartStore.setQuantity(item.id, value)}
      />
      <div className="flex gap-2">
        {item.kind === "custom" ? (
          <Link
            href={`/build?edit=${encodeURIComponent(item.id)}`}
            aria-label={`Edit ${line.name}`}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-11 flex-1 font-semibold",
            })}
          >
            Edit
          </Link>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 flex-1 gap-2 font-semibold"
          aria-label={`Remove ${line.name}`}
          onClick={() => cartStore.remove(item.id)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="mt-6 rounded-2xl border bg-surface p-6">
      <p className="text-lg font-semibold">Your cart is empty.</p>
      <p className="mt-1 text-muted-foreground">
        Choose a signature drink from the menu, or build your own.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/menu"
          className={buttonVariants({
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          View the menu
        </Link>
        <Link
          href="/build"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "h-11 px-5 font-semibold",
          })}
        >
          Build your drink
        </Link>
      </div>
    </div>
  );
}
