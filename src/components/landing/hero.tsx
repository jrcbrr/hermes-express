import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { AnimatedCup } from "./animated-cup";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-4 pt-10 pb-16 md:px-6 md:pt-20 md:pb-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold tracking-widest text-accent uppercase">
            {siteConfig.name}
          </p>
          <h1
            id="hero-heading"
            className="mt-3 text-4xl leading-tight font-extrabold tracking-tight text-balance md:text-6xl"
          >
            {siteConfig.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground md:mx-0">
            Welcome to {siteConfig.name}. What shall we prepare for you today?
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/build"
              className={buttonVariants({
                size: "lg",
                className: "h-12 px-6 text-base font-semibold",
              })}
            >
              Build Your Drink
            </Link>
            <Link
              href="/menu"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-12 px-6 text-base font-semibold",
              })}
            >
              View Menu
            </Link>
          </div>
        </div>
        <AnimatedCup className="mx-auto w-56 md:w-80" />
      </div>
    </section>
  );
}
