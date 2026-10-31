import type { Metadata } from "next";
import Link from "next/link";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <HermesMascot className="size-28 text-primary" />
      <h1 className="font-heading text-3xl font-extrabold">
        We could not find that page
      </h1>
      <p className="text-muted-foreground">
        Even Hermes, messenger of the gods, could not deliver this one. The page
        may have moved, or the address may be mistyped.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className={buttonVariants({ className: "h-11 px-4 font-semibold" })}
        >
          Return home
        </Link>
        <Link
          href="/menu"
          className={buttonVariants({
            variant: "outline",
            className: "h-11 px-4 font-semibold",
          })}
        >
          View the menu
        </Link>
      </div>
    </div>
  );
}
