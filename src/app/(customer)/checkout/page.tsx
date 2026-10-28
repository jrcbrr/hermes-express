import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Checkout" };

// Placeholder until Stage 5 (checkout).
export default function CheckoutPage() {
  return (
    <ComingSoon
      path="/checkout"
      title="Checkout"
      message="Checkout is coming soon. Ordering opens once the menu and builder are ready."
    />
  );
}
