import type { Metadata } from "next";
import { Suspense } from "react";
import { BuilderContent } from "@/components/builder/builder-content";

export const metadata: Metadata = {
  title: "Build Your Drink",
  description:
    "Build your own coffee step by step: choose a cup, a base, milk, sweetness and toppings, and watch it come together.",
};

export default function BuildPage({ searchParams }: PageProps<"/build">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Build your drink
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Choose each part of your drink and watch it come together. The price
        updates as you go.
      </p>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Preparing the builder…
          </p>
        }
      >
        <BuilderContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
