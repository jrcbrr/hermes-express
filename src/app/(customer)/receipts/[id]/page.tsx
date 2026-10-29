import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptDetails } from "@/components/receipts/receipt-details";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-28 md:px-6 md:py-16 print:p-0">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl print:sr-only">
        Receipt
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your receipt…
          </p>
        }
      >
        <ReceiptDetails params={params} />
      </Suspense>
    </div>
  );
}
