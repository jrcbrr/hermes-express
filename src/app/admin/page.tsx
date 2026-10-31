import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { SalesCharts } from "@/components/admin/sales-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { SALES_CHART_DAYS, type BranchSales } from "@/lib/admin";
import { formatPeso } from "@/lib/money";
import { requireRole } from "@/server/auth/session";
import { getSalesCharts, getTodaySummary } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin" };

function SalesCard({ sales }: { sales: BranchSales }) {
  return (
    <section
      aria-label={sales.name}
      className="rounded-2xl border bg-surface p-5 shadow-sm"
    >
      <h2 className="font-heading text-lg font-extrabold">{sales.name}</h2>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Orders</dt>
          <dd className="text-xl font-bold">{sales.orders}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Revenue</dt>
          <dd className="text-xl font-bold">
            {formatPeso(sales.revenueCentavos)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Average order</dt>
          <dd className="text-xl font-bold">
            {formatPeso(sales.averageCentavos)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

async function Summary() {
  await requireRole(["admin"], "/admin");
  const { overall, branches } = await getTodaySummary(new Date());
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <SalesCard sales={overall} />
      {branches.map((sales) => (
        <SalesCard key={sales.slug} sales={sales} />
      ))}
    </div>
  );
}

async function Charts() {
  await requireRole(["admin"], "/admin");
  return <SalesCharts data={await getSalesCharts(new Date())} />;
}

export default function AdminPage() {
  return (
    <>
      <AdminHeading title="Today" />
      <p className="mt-2 text-sm text-muted-foreground">
        Manila time. Cancelled orders are not counted; cash orders are.
      </p>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading today&rsquo;s sales…
          </p>
        }
      >
        <Summary />
      </Suspense>
      <h2 className="mt-10 font-heading text-2xl font-extrabold">
        Last {SALES_CHART_DAYS} days
      </h2>
      <Suspense
        fallback={
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <p role="status" className="sr-only">
              Loading the sales charts…
            </p>
            <Skeleton className="h-80 rounded-2xl xl:col-span-2" />
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Charts />
      </Suspense>
    </>
  );
}
