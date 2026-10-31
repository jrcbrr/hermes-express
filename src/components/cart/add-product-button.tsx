"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cartStore } from "./cart-store";

const CONFIRM_MS = 2000;

/** "Add to cart" for a menu item, with a short "Added" confirmation. */
export function AddProductButton({
  slug,
  name,
  disabled = false,
}: {
  slug: string;
  name: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "added" | "full">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [status]);

  function add() {
    const ok = cartStore.add({
      kind: "product",
      productSlug: slug,
      quantity: 1,
    });
    setStatus(ok ? "added" : "full");
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="h-11 flex-1 gap-2 font-semibold"
        disabled={disabled}
        aria-label={`${status === "added" ? "Added" : "Add to cart"}: ${name}`}
        onClick={add}
      >
        {status === "added" ? (
          <>
            <Check className="size-4" aria-hidden="true" />
            Added
          </>
        ) : (
          "Add to cart"
        )}
      </Button>
      <span role="status" className="sr-only">
        {status === "added"
          ? `${name} added to your cart.`
          : status === "full"
            ? "Your cart is full. Please check out or remove an item first."
            : ""}
      </span>
    </>
  );
}
