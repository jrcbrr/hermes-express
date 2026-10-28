import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth, type AuthSession, type SessionUser } from "@/lib/auth";
import { hasRole, loginRedirectPath, type Role } from "@/lib/roles";

/** The current session, or null. Cached so one request reads it only once. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const requestHeaders = await headers();
  // Session data is per user: never read it while prerendering or prefetching.
  await connection();
  // With no database (a fresh clone, or CI), everyone is simply signed out.
  if (!process.env.DATABASE_URL) return null;
  return getAuth().api.getSession({ headers: requestHeaders });
});

/**
 * Returns the signed-in user, or sends them to /login. `returnTo` is where
 * they land after logging in (usually the page that called this).
 */
export async function requireUser(returnTo = "/"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(loginRedirectPath(returnTo));
  return session.user;
}

/**
 * Returns the signed-in user if they have one of `roles`. Signed-out visitors
 * go to /login; signed-in users without the role go to the home page.
 * Call this in every staff page, layout and server action: the proxy's cookie
 * check alone can't tell who the user is.
 */
export async function requireRole(
  roles: readonly Role[],
  returnTo = "/",
): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!hasRole(user.role, roles)) redirect("/");
  return user;
}
