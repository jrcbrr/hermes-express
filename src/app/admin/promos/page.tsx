import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, linkClass } from "@/components/admin/admin-ui";
import { PromoActiveToggle } from "@/components/admin/promo-active-toggle";
import { buttonVariants } from "@/components/ui/button";
import { describePromo } from "@/lib/promos";
import { requireRole } from "@/server/auth/session";
import { listPromos } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin promos" };

async function PromosContent() {
  await requireRole(["admin"], "/admin/promos");
  const promos = await listPromos();
  if (promos.length === 0) {
    return <p className="mt-6 text-muted-foreground">No promo codes yet.</p>;
  }
  return (
    <ul className="mt-6 flex flex-col gap-2">
      {promos.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-3"
        >
          <div className="min-w-0">
            <Link href={`/admin/promos/${p.id}`} className={linkClass}>
              {p.code}
            </Link>
            <p className="text-sm text-muted-foreground">
              {describePromo(p)} · Used {p.usedCount}
              {p.maxUses === null ? "" : ` of ${p.maxUses}`}
              {p.isActive ? "" : " · Off"}
            </p>
          </div>
          <PromoActiveToggle id={p.id} code={p.code} isActive={p.isActive} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminPromosPage() {
  return (
    <>
      <AdminHeading
        title="Promos"
        action={
          <Link
            href="/admin/promos/new"
            className={buttonVariants({ size: "lg", className: "h-11 px-5" })}
          >
            Add a code
          </Link>
        }
      />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading promo codes…
          </p>
        }
      >
        <PromosContent />
      </Suspense>
    </>
  );
}
