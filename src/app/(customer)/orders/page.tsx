import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Your orders" };

// Placeholder until Stage 5 (checkout) and Stage 6 (tracking).
export default function OrdersPage() {
  return (
    <ComingSoon
      path="/orders"
      title="Your orders"
      message="Order tracking and history are coming soon. Thank you for your patience."
    />
  );
}
