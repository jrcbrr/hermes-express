"use client";

import { useEffect } from "react";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { siteConfig } from "@/config/site";
import "./globals.css";

/** Replaces the whole page when the root layout itself fails. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground">
        <title>{`Something went wrong | ${siteConfig.name}`}</title>
        <main className="flex flex-col items-center gap-4">
          <HermesMascot className="size-28 text-primary" />
          <h1 className="text-3xl font-extrabold">Something went wrong</h1>
          <p>We apologise. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
