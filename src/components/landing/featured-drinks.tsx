import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { FeaturedDrinkList } from "./featured-drink-list";
import { Section } from "./section";

export function FeaturedDrinks() {
  return (
    <Section
      id="featured"
      title="Featured drinks"
      intro="Our signature creations. Order one as it is, or make it your own."
      className="bg-surface-muted/60"
    >
      <Suspense
        fallback={
          <p role="status" className="text-center text-muted-foreground">
            Loading our signature drinks…
          </p>
        }
      >
        <FeaturedDrinkList />
      </Suspense>
      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <LogoMark className="size-5 text-primary" />
        Prices shown are for a 12oz cup.
      </p>
    </Section>
  );
}
