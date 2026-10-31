import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireRole } from "@/server/auth/session";

/** Guards the whole area. Pages and actions still check for themselves. */
async function AdminShell({ children }: { children: ReactNode }) {
  await requireRole(["admin"], "/admin");
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-28 md:flex-row md:gap-10 md:px-6 md:py-10">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-muted-foreground">
          Loading…
        </p>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
