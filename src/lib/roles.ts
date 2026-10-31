/**
 * Roles and route access rules (docs/PLAN.md §8). Pure functions only, so the
 * proxy, server helpers and UI all share one definition.
 */

export const ROLES = ["customer", "barista", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** True when `role` is one of `allowed`. Unknown or missing roles never pass. */
export function hasRole(
  role: string | null | undefined,
  allowed: readonly Role[],
): boolean {
  return isRole(role) && allowed.includes(role);
}

/**
 * May this user change orders and stock at this branch? Admins everywhere,
 * baristas only at their own branch. Having placed an order gives no right.
 */
export function canManageBranch(
  user: { role?: string | null; branchId?: string | null },
  branchId: string,
): boolean {
  if (hasRole(user.role, ["admin"])) return true;
  return hasRole(user.role, ["barista"]) && user.branchId === branchId;
}

/** What a path needs: nothing, any signed-in user, or specific roles. */
export type RouteAccess =
  | { kind: "public" }
  | { kind: "user" }
  | { kind: "role"; roles: readonly Role[] };

/** Customer pages that need a signed-in user (any role). */
export const USER_ONLY_PREFIXES = [
  "/checkout",
  "/orders",
  "/favorites",
  "/receipts",
  "/rewards",
  "/profile",
] as const;

/** Staff areas and the roles allowed in each. */
export const ROLE_PREFIXES: readonly {
  prefix: string;
  roles: readonly Role[];
}[] = [
  { prefix: "/barista", roles: ["barista", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRouteAccess(pathname: string): RouteAccess {
  for (const { prefix, roles } of ROLE_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return { kind: "role", roles };
  }
  if (USER_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return { kind: "user" };
  }
  return { kind: "public" };
}

/** Can a visitor with this role (null = signed out) open this path? */
export function canAccessPath(pathname: string, role: Role | null): boolean {
  const access = getRouteAccess(pathname);
  if (access.kind === "public") return true;
  if (role === null) return false;
  if (access.kind === "user") return true;
  return access.roles.includes(role);
}

export const LOGIN_PATH = "/login";

/**
 * Only allow same-site relative paths as the post-login destination, so a
 * crafted `?next=https://evil.example` link can't send users off-site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return "/";
  }
  return next;
}

/** The login URL that brings the user back to `pathname` afterwards. */
export function loginRedirectPath(pathname: string): string {
  return `${LOGIN_PATH}?next=${encodeURIComponent(safeNextPath(pathname))}`;
}
