import type { Metadata } from "next";
import { Suspense } from "react";
import { CartContent } from "@/components/cart/cart-content";

export const metadata: Metadata = { title: "Cart" };

// Open to guests: login is only needed at checkout.
export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Your cart
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your cart…
          </p>
        }
      >
        <CartContent />
      </Suspense>
    </div>
  );
}
