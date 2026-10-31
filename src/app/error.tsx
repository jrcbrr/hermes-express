"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { Button, buttonVariants } from "@/components/ui/button";

/** Shown when a page fails. Never shows the error text, which may hold details. */
export default function ErrorPage({
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
    <div
      role="alert"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <HermesMascot className="size-28 text-primary" />
      <h1 className="font-heading text-3xl font-extrabold">
        Something went wrong
      </h1>
      <p className="text-muted-foreground">
        We apologise. Hermes has stumbled on the way. Please try again in a
        moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          onClick={reset}
          className="h-11 px-4 font-semibold"
        >
          Try again
        </Button>
        <Link
          href="/"
          className={buttonVariants({
            variant: "outline",
            className: "h-11 px-4 font-semibold",
          })}
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
