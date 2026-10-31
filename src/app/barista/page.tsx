import type { Metadata } from "next";
import { Suspense } from "react";
import { QueueContent } from "@/components/barista/queue-content";

export const metadata: Metadata = { title: "Barista" };

export default function BaristaPage({ searchParams }: PageProps<"/barista">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Barista queue
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-3 text-muted-foreground">
            Loading the queue…
          </p>
        }
      >
        <QueueContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
