import { requireRole } from "@/server/auth/session";
import { resolveStaffBranch } from "@/server/barista/branch";
import { listBranchQueue } from "@/server/orders/queries";
import { QueueBoard } from "./queue-board";
import { StaffBranchNav } from "./staff-branch-nav";

const NO_BRANCH = "No branch is assigned to your account. Please ask an admin.";

/** Guards the queue and loads the first look at it. */
export async function QueueContent({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>;
}) {
  const user = await requireRole(["barista", "admin"], "/barista");
  const { branch } = await searchParams;
  const branches = await resolveStaffBranch(
    user,
    typeof branch === "string" ? branch : null,
  );
  if (!branches) {
    return <p className="mt-3 text-muted-foreground">{NO_BRANCH}</p>;
  }
  const { current } = branches;
  const orders = await listBranchQueue(current.id);

  return (
    <>
      <p className="mt-2 text-muted-foreground">{current.name}</p>
      <StaffBranchNav branches={branches} page="/barista" />
      {/* A different branch starts a fresh board. */}
      <QueueBoard
        key={current.id}
        branchSlug={current.slug}
        initialOrders={orders}
      />
    </>
  );
}
