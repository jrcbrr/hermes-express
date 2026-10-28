import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { buttonVariants } from "@/components/ui/button";
import { formatPeso } from "@/lib/format";
import { featuredDrinks } from "./featured-drinks.data";
import { Section } from "./section";

export function FeaturedDrinks() {
  return (
    <Section
      id="featured"
      title="Featured drinks"
      intro="Our signature creations. Order one as it is, or make it your own."
      className="bg-surface-muted/60"
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featuredDrinks.map((drink) => (
          <li
            key={drink.slug}
            className="flex flex-col rounded-2xl border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{drink.name}</h3>
              <p className="shrink-0 font-semibold">
                {formatPeso(drink.priceCentavos)}
              </p>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {drink.description}
            </p>
            <div className="mt-5 flex gap-2">
              {/* Real add-to-cart and builder prefill arrive in Stages 3–5. */}
              <Link
                href="/menu"
                aria-label={`Add ${drink.name}`}
                className={buttonVariants({
                  size: "lg",
                  className: "flex-1 font-semibold",
                })}
              >
                Add
              </Link>
              <Link
                href="/build"
                aria-label={`Customise ${drink.name}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "flex-1 font-semibold",
                })}
              >
                Customise
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <LogoMark className="size-5 text-primary" />
        Prices shown are for a 12oz cup.
      </p>
    </Section>
  );
}
