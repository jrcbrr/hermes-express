import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminHeading, linkClass } from "@/components/admin/admin-ui";
import {
  CustomerForm,
  PointsForm,
  RoleForm,
} from "@/components/admin/customer-forms";
import { formatPeso } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { formatReceiptDateTime } from "@/lib/receipt";
import { requireRole } from "@/server/auth/session";
import { getUserWithOrders, listBranches } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin customer" };

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border bg-surface p-5 shadow-sm"
    >
      <h2 className="mb-4 font-heading text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

async function CustomerDetail({ params }: PageProps<"/admin/customers/[id]">) {
  const admin = await requireRole(["admin"], "/admin/customers");
  const { id } = await params;
  const [customer, branches] = await Promise.all([
    getUserWithOrders(id),
    listBranches(),
  ]);
  if (!customer) notFound();

  return (
    <>
      <p className="mt-2 break-words text-muted-foreground">
        {customer.name} · {customer.email}
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Profile">
          <CustomerForm
            userId={customer.id}
            initial={{
              name: customer.name,
              phone: customer.phone ?? "",
              defaultAddress: customer.defaultAddress ?? "",
            }}
          />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Role">
            <RoleForm
              userId={customer.id}
              isSelf={customer.id === admin.id}
              branches={branches}
              initial={{
                role: customer.role,
                branchId: customer.branchId ?? "",
              }}
            />
          </Panel>
          <Panel title="Points">
            <p className="mb-4">
              Current balance:{" "}
              <strong data-testid="points-balance">
                {customer.pointsBalance}
              </strong>
            </p>
            <PointsForm userId={customer.id} />
          </Panel>
        </div>
      </div>
      <section aria-label="Orders" className="mt-8">
        <h2 className="font-heading text-xl font-extrabold">Orders</h2>
        {customer.orders.length === 0 ? (
          <p className="mt-3 text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {customer.orders.map((o) => (
              <li key={o.id} className="rounded-xl border bg-surface p-3">
                <Link href={`/orders/${o.id}`} className={linkClass}>
                  {o.code}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {o.branchName} · {ORDER_STATUS_LABELS[o.status]} ·{" "}
                  {formatPeso(o.totalCentavos)} ·{" "}
                  {formatReceiptDateTime(o.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function AdminCustomerPage(
  props: PageProps<"/admin/customers/[id]">,
) {
  return (
    <>
      <AdminHeading title="Customer" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading the account…
          </p>
        }
      >
        <CustomerDetail {...props} />
      </Suspense>
    </>
  );
}
