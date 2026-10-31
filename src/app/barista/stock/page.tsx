import type { Metadata } from "next";
import { Suspense } from "react";
import { StockContent } from "@/components/barista/stock-content";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage({
  searchParams,
}: PageProps<"/barista/stock">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Sold-out items
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-3 text-muted-foreground">
            Loading stock…
          </p>
        }
      >
        <StockContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
