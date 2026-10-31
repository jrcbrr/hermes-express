import Link from "next/link";
import { HermesMascot } from "@/components/brand/hermes-mascot";
import { buttonVariants } from "@/components/ui/button";
import { BADGES } from "@/lib/badges";
import { formatPeso } from "@/lib/money";
import { CENTAVOS_PER_POINT, REWARD_TIERS } from "@/lib/points";
import { Section } from "./section";

const perks = [
  {
    value: "1 point",
    text: `for every ${formatPeso(CENTAVOS_PER_POINT)} you spend`,
  },
  {
    value: `${REWARD_TIERS[0]!.points} points`,
    text: `for a free ${REWARD_TIERS[0]!.size} drink`,
  },
  { value: `${BADGES.length} badges`, text: "to collect as you explore" },
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
