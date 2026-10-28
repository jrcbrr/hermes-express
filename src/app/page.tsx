import { Branches } from "@/components/landing/branches";
import { BuilderTeaser } from "@/components/landing/builder-teaser";
import { FeaturedDrinks } from "@/components/landing/featured-drinks";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { RewardsTeaser } from "@/components/landing/rewards-teaser";

// Landing page (docs/PLAN.md §4). The footer, section 7, comes from the root layout.
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FeaturedDrinks />
      <BuilderTeaser />
      <RewardsTeaser />
      <Branches />
    </>
  );
}
