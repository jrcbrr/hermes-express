import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Favorites" };

// Placeholder until Stage 8 (favorites).
export default function FavoritesPage() {
  return (
    <ComingSoon
      path="/favorites"
      title="Favorites"
      message="Saving your favorite drinks is coming soon. You will be able to reorder them in one tap."
    />
  );
}
