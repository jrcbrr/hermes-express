"use client";

import Link from "next/link";
import { useState } from "react";
import { cartStore } from "@/components/cart/cart-store";
import { Button } from "@/components/ui/button";
import type { NewCartItem } from "@/lib/cart";

/** Adds items to the cart in one tap. Checkout prices them at today's prices. */
export function ReorderButton({
  entries,
  unavailable = [],
  label,
  ariaLabel,
}: {
  entries: NewCartItem[];
  /** Items that can't be ordered any more, named in the message. */
  unavailable?: string[];
  label: string;
  ariaLabel: string;
}) {
  const [status, setStatus] = useState<"idle" | "added" | "full">("idle");

  const reorder = () => {
    const allFit = entries.map((entry) => cartStore.add(entry)).every(Boolean);
    setStatus(allFit ? "added" : "full");
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 self-start px-4 font-semibold"
        disabled={entries.length === 0}
        onClick={reorder}
        aria-label={ariaLabel}
      >
        {label}
      </Button>
      <p role="status" className="text-sm empty:hidden">
        {status === "added" ? (
          <>
            Added to your cart at current prices.{" "}
            <Link
              href="/cart"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              View cart
            </Link>
          </>
        ) : status === "full" ? (
          "Your cart is full. Please check out or remove an item first."
        ) : null}
      </p>
      {unavailable.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          No longer available: {unavailable.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
