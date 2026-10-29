import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuContent } from "@/components/menu/menu-content";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Signature drinks, pastries and snacks from Hermes Express, with availability for each branch.",
};

export default function MenuPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Menu
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Order a signature as it is, or open it in the builder and make it your
        own.
      </p>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading the menu…
          </p>
        }
      >
        <MenuContent />
      </Suspense>
    </div>
  );
}
