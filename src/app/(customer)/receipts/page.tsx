import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptList } from "@/components/receipts/receipt-list";

export const metadata: Metadata = { title: "Your receipts" };

export default function ReceiptsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Your receipts
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your receipts…
          </p>
        }
      >
        <ReceiptList />
      </Suspense>
    </div>
  );
}
