"use client";

import type { ComponentProps } from "react";
import { useCart } from "@/components/cart/cart-store";
import { findCartItem } from "@/lib/cart";
import { draftFromConfig } from "@/lib/builder/state";
import { CoffeeBuilder } from "./coffee-builder";

type BuilderProps = ComponentProps<typeof CoffeeBuilder>;

/**
 * Starts the builder. With `/build?edit=<id>`, it waits for the cart (kept in
 * the browser) and opens that drink, ready to update in place.
 */
export function BuilderEntry({
  editId,
  ...props
}: Omit<BuilderProps, "editing"> & { editId: string | null }) {
  const { ready, cart } = useCart();
  if (editId === null) return <CoffeeBuilder {...props} />;

  if (!ready) {
    return (
      <p role="status" className="mt-6 text-muted-foreground">
        Opening your drink…
      </p>
    );
  }

  const item = findCartItem(cart.items, editId);
  if (item?.kind !== "custom") {
    return (
      <CoffeeBuilder
        {...props}
        notice="We could not find that drink in your cart, so here is an empty cup to start from."
      />
    );
  }
  return (
    <CoffeeBuilder
      {...props}
      // Remount if another drink is opened for editing.
      key={item.id}
      start={draftFromConfig(item.config)}
      signatureName={null}
      editing={{ itemId: item.id, quantity: item.quantity }}
    />
  );
}
