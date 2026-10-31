import { hasRole } from "@/lib/roles";
import { getSession } from "@/server/auth/session";
import { resolveStaffBranch } from "@/server/barista/branch";
import { listBranchQueue } from "@/server/orders/queries";

// The queue holds customers' names, phones and addresses: never cache it.
const NO_STORE = { "Cache-Control": "private, no-store" };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

/**
 * GET /api/barista/queue?branch=<slug>: what the board polls. A barista only
 * ever gets their own branch; `branch` is for admins.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return error("Please log in.", 401);
  if (!hasRole(session.user.role, ["barista", "admin"])) {
    return error("Staff only.", 403);
  }
  const slug = new URL(request.url).searchParams.get("branch");
  const branches = await resolveStaffBranch(session.user, slug);
  if (!branches) return error("No branch is assigned to this account.", 404);

  const orders = await listBranchQueue(branches.current.id);
  return Response.json({ orders }, { headers: NO_STORE });
}
