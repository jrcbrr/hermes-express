import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Rewards" };

// Placeholder until Stage 8 (rewards).
export default function RewardsPage() {
  return (
    <ComingSoon
      path="/rewards"
      title="Rewards"
      message="Points, rewards and badges are coming soon. Every cup you order will count toward them."
    />
  );
}
