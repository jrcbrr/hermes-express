import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { PromoForm } from "@/components/admin/promo-form";
import { requireRole } from "@/server/auth/session";

export const metadata: Metadata = { title: "Add a promo code" };

async function NewPromo() {
  await requireRole(["admin"], "/admin/promos/new");
  return (
    <PromoForm
      initial={{
        code: "",
        type: "percent",
        value: "",
        maxDiscount: "",
        minSubtotal: "",
        firstOrderOnly: false,
        startsAt: "",
        endsAt: "",
        maxUses: "",
        isActive: true,
      }}
    />
  );
}

export default function NewPromoPage() {
  return (
    <>
      <AdminHeading title="Add a promo code" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading…
          </p>
        }
      >
        <NewPromo />
      </Suspense>
    </>
  );
}
