import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeading, linkClass } from "@/components/admin/admin-ui";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_TYPES, type ProductType } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";
import { requireRole } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Admin menu" };

const HEADINGS: Record<ProductType, string> = {
  signature: "Signature drinks",
  pastry: "Pastries",
  snack: "Snacks",
};

async function MenuContent() {
  await requireRole(["admin"], "/admin/menu");
  const { products } = await getCatalogSnapshot();
  return PRODUCT_TYPES.map((type) => (
    <section key={type} aria-label={HEADINGS[type]} className="mt-8">
      <h2 className="font-heading text-xl font-extrabold">{HEADINGS[type]}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {products
          .filter((p) => p.type === type)
          .map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-3"
            >
              <div className="min-w-0">
                <Link href={`/admin/menu/${p.id}`} className={linkClass}>
                  {p.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatPeso(p.priceCentavos)}
                  {p.isSeasonal ? " · Seasonal" : ""}
                  {p.isActive ? "" : " · Hidden"}
                </p>
              </div>
              <ProductActiveToggle
                id={p.id}
                name={p.name}
                isActive={p.isActive}
              />
            </li>
          ))}
      </ul>
    </section>
  ));
}

export default function AdminMenuPage() {
  return (
    <>
      <AdminHeading
        title="Menu"
        action={
          <Link
            href="/admin/menu/new"
            className={buttonVariants({ size: "lg", className: "h-11 px-5" })}
          >
            Add an item
          </Link>
        }
      />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading the menu…
          </p>
        }
      >
        <MenuContent />
      </Suspense>
    </>
  );
}
