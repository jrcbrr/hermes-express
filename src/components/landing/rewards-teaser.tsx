import Link from "next/link";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "./section";

// Values from docs/PLAN.md §8. TODO(Stage 8): read them from src/lib/points.ts.
const perks = [
  { value: "1 point", text: "for every ₱10 you spend" },
  { value: "150 points", text: "for a free 12oz drink" },
  { value: "9 badges", text: "to collect as you explore" },
] as const;

export function RewardsTeaser() {
  return (
    <Section
      id="rewards"
      title="Earn points with every cup"
      intro="Every order brings you closer to a drink on the house."
      className="bg-surface-muted/60"
    >
      <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
        <HermesMascot className="mx-auto w-32 text-accent md:w-44" />
        <div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {perks.map((perk) => (
              <li
                key={perk.value}
                className="rounded-2xl border bg-surface p-5 text-center shadow-sm"
              >
                <p className="font-heading text-2xl font-extrabold">
                  {perk.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {perk.text}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center md:text-left">
            <Link
              href="/rewards"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-11 px-5 font-semibold",
              })}
            >
              See rewards
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
