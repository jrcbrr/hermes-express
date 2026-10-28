import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffPlaceholder } from "@/components/staff/staff-placeholder";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <Suspense>
        <StaffPlaceholder
          roles={["admin"]}
          path="/admin"
          title="Admin"
          stage="Stage 7"
        />
      </Suspense>
    </div>
  );
}
