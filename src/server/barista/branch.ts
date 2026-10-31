// Which branch a staff member is working on, for the queue and stock pages.
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { branch } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

export type StaffBranch = { id: string; slug: string; name: string };

export type StaffBranches = {
  current: StaffBranch;
  /** The branches this user may switch to: every branch for an admin. */
  switchable: StaffBranch[];
};

/**
 * A barista always gets their own branch: `requestedSlug` is ignored, so a
 * changed link can't open another branch. An admin has no branch and picks
 * one, starting with the first. Null when the user has no branch to work on.
 */
export async function resolveStaffBranch(
  user: Pick<SessionUser, "role" | "branchId">,
  requestedSlug: string | null | undefined,
): Promise<StaffBranches | null> {
  const isAdmin = hasRole(user.role, ["admin"]);
  if (!isAdmin && !hasRole(user.role, ["barista"])) return null;

  const branches = await getDb()
    .select({ id: branch.id, slug: branch.slug, name: branch.name })
    .from(branch)
    .orderBy(asc(branch.name));

  if (isAdmin) {
    const current =
      branches.find((b) => b.slug === requestedSlug) ?? branches[0];
    return current ? { current, switchable: branches } : null;
  }
  const own = branches.find((b) => b.id === user.branchId);
  return own ? { current: own, switchable: [] } : null;
}
