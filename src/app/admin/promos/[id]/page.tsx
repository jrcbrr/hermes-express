import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { PromoForm } from "@/components/admin/promo-form";
import { manilaDateString } from "@/lib/admin";
import { requireRole } from "@/server/auth/session";
import { getPromo } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Edit a promo code" };

const pesos = (centavos: number | null) =>
  centavos === null ? "" : String(centavos / 100);

async function EditPromo({ params }: PageProps<"/admin/promos/[id]">) {
  await requireRole(["admin"], "/admin/promos");
  const { id } = await params;
  const promo = await getPromo(id);
  if (!promo) notFound();

  return (
    <>
      <p className="mt-2 font-semibold">
        {promo.code} · Used {promo.usedCount}
        {promo.maxUses === null ? "" : ` of ${promo.maxUses}`}
      </p>
      <PromoForm
        initial={{
          id: promo.id,
          code: promo.code,
          type: promo.type,
          value:
            promo.type === "percent" ? String(promo.value) : pesos(promo.value),
          maxDiscount: pesos(promo.maxDiscountCentavos),
          minSubtotal:
            promo.minSubtotalCentavos === 0
              ? ""
              : pesos(promo.minSubtotalCentavos),
          firstOrderOnly: promo.firstOrderOnly,
          startsAt: promo.startsAt ? manilaDateString(promo.startsAt) : "",
          endsAt: promo.endsAt ? manilaDateString(promo.endsAt) : "",
          maxUses: promo.maxUses === null ? "" : String(promo.maxUses),
          isActive: promo.isActive,
        }}
      />
    </>
  );
}

export default function EditPromoPage(props: PageProps<"/admin/promos/[id]">) {
  return (
    <>
      <AdminHeading title="Edit a promo code" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading…
          </p>
        }
      >
        <EditPromo {...props} />
      </Suspense>
    </>
  );
}
