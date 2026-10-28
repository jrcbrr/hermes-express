import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { USER_ONLY_PREFIXES, ROLE_PREFIXES } from "@/lib/roles";
import { config, proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });
}

const SESSION_COOKIE = "better-auth.session_token=abc.def";

describe("proxy", () => {
  it("lets public pages through", () => {
    expect(proxy(request("/menu")).headers.get("location")).toBeNull();
  });

  it("sends signed-out visitors on protected pages to login, keeping the query", () => {
    const response = proxy(request("/orders/HX-1?tab=items"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Forders%2FHX-1%3Ftab%3Ditems",
    );
  });

  it("lets anyone with a session cookie through (pages check roles)", () => {
    expect(
      proxy(request("/admin", SESSION_COOKIE)).headers.get("location"),
    ).toBeNull();
  });

  it("also recognizes the secure cookie used over HTTPS", () => {
    const response = proxy(request("/profile", `__Secure-${SESSION_COOKIE}`));
    expect(response.headers.get("location")).toBeNull();
  });

  it("has a matcher for every protected prefix", () => {
    const prefixes = [
      ...USER_ONLY_PREFIXES,
      ...ROLE_PREFIXES.map((r) => r.prefix),
    ];
    expect([...config.matcher].sort()).toEqual(
      prefixes.map((p) => `${p}/:path*`).sort(),
    );
  });
});
