import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetails } from "@/components/orders/order-details";
import { OrderRatings } from "@/components/ratings/order-ratings";
import { BadgeNotice } from "@/components/rewards/badge-notice";

export const metadata: Metadata = { title: "Your order" };

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Your order
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your order…
          </p>
        }
      >
        <OrderDetails params={params} />
      </Suspense>
      <Suspense>
        <OrderRatings params={params} />
        <BadgeNotice path="/orders" />
      </Suspense>
    </div>
  );
}
