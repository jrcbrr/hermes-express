import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutContent } from "@/components/checkout/checkout-content";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Checkout
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Preparing checkout…
          </p>
        }
      >
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
