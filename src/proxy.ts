import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getRouteAccess, loginRedirectPath } from "@/lib/roles";

/**
 * Fast first check for protected pages: no session cookie means "go log in".
 * It only looks at the cookie (no database call), so it can't verify roles or
 * expired sessions. Pages and server actions do the real check with
 * requireUser() / requireRole() in src/server/auth/session.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (getRouteAccess(pathname).kind === "public") return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();

  const loginUrl = new URL(
    loginRedirectPath(`${pathname}${search}`),
    request.url,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Keep in sync with USER_ONLY_PREFIXES and ROLE_PREFIXES in src/lib/roles.ts.
  matcher: [
    "/checkout/:path*",
    "/orders/:path*",
    "/favorites/:path*",
    "/receipts/:path*",
    "/rewards/:path*",
    "/profile/:path*",
    "/barista/:path*",
    "/admin/:path*",
  ],
};
