import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffPlaceholder } from "@/components/staff/staff-placeholder";

export const metadata: Metadata = { title: "Barista" };

export default function BaristaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <Suspense>
        <StaffPlaceholder
          roles={["barista", "admin"]}
          path="/barista"
          title="Barista queue"
          stage="Stage 6"
        />
      </Suspense>
    </div>
  );
}
