"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { CART_HREF } from "@/components/layout/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { cartCount } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-store";

/** "Cart" or "Cart, 3 items", for links whose text is only an icon. */
export function cartLabel(count: number): string {
  if (count === 0) return "Cart";
  return `Cart, ${count} ${count === 1 ? "item" : "items"}`;
}

export function useCartCount(): number {
  const { cart } = useCart();
  return cartCount(cart.items);
}

/** A small gold bubble with the number of items. Hidden when empty. */
export function CartBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      data-testid="cart-count"
      className={cn(
        "absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.7rem] leading-none font-bold text-primary-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** The header's cart icon (desktop), with the item count. */
export function CartHeaderLink() {
  const count = useCartCount();
  return (
    <Link
      href={CART_HREF}
      aria-label={cartLabel(count)}
      className={buttonVariants({
        variant: "ghost",
        size: "icon-lg",
        className: "relative",
      })}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      <CartBadge count={count} className="-top-0.5 -right-0.5" />
    </Link>
  );
}
