import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminHeading,
  controlClass,
  linkClass,
  Pager,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parsePage } from "@/lib/admin";
import { requireRole } from "@/server/auth/session";
import { listUsers } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Admin customers" };

async function CustomersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/customers">["searchParams"];
}) {
  await requireRole(["admin"], "/admin/customers");
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const page = parsePage(params.page);
  const { rows, hasMore } = await listUsers(search, page);

  return (
    <>
      <Form
        action="/admin/customers"
        key={search}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="customer-search">Name, email or mobile number</Label>
          <input
            id="customer-search"
            name="q"
            type="search"
            defaultValue={search}
            className={controlClass}
          />
        </div>
        <Button type="submit" size="lg" className="h-11 px-6">
          Search
        </Button>
      </Form>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No accounts match.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((u) => (
            <li key={u.id} className="rounded-xl border bg-surface p-3">
              <Link href={`/admin/customers/${u.id}`} className={linkClass}>
                {u.name}
              </Link>
              <p className="text-sm break-words text-muted-foreground">
                {u.email}
                {u.phone ? ` · ${u.phone}` : ""}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {u.role} · {u.pointsBalance} points
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pager
        path="/admin/customers"
        params={{ q: search }}
        page={page}
        hasMore={hasMore}
      />
    </>
  );
}

export default function AdminCustomersPage({
  searchParams,
}: PageProps<"/admin/customers">) {
  return (
    <>
      <AdminHeading title="Customers" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading accounts…
          </p>
        }
      >
        <CustomersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
