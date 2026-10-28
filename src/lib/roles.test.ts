import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  getRouteAccess,
  hasRole,
  isRole,
  loginRedirectPath,
  safeNextPath,
  type Role,
} from "./roles";

describe("isRole / hasRole", () => {
  it("recognizes only the three roles", () => {
    expect(isRole("customer")).toBe(true);
    expect(isRole("barista")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("owner")).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(1)).toBe(false);
  });

  it("passes only roles in the allowed list", () => {
    expect(hasRole("admin", ["admin"])).toBe(true);
    expect(hasRole("barista", ["barista", "admin"])).toBe(true);
    expect(hasRole("customer", ["barista", "admin"])).toBe(false);
    expect(hasRole(null, ["customer"])).toBe(false);
    expect(hasRole("superuser", ["admin"])).toBe(false);
  });
});

describe("getRouteAccess", () => {
  it("leaves public pages open", () => {
    for (const path of ["/", "/menu", "/build", "/login", "/signup", "/cart"]) {
      expect(getRouteAccess(path)).toEqual({ kind: "public" });
    }
  });

  it("requires login for customer pages and their sub-pages", () => {
    for (const path of [
      "/checkout",
      "/orders",
      "/orders/HX-7K2P",
      "/favorites",
      "/rewards",
      "/profile",
    ]) {
      expect(getRouteAccess(path)).toEqual({ kind: "user" });
    }
  });

  it("does not match look-alike paths", () => {
    expect(getRouteAccess("/profiles")).toEqual({ kind: "public" });
    expect(getRouteAccess("/administrator")).toEqual({ kind: "public" });
  });

  it("limits staff areas to their roles", () => {
    expect(getRouteAccess("/barista/queue")).toEqual({
      kind: "role",
      roles: ["barista", "admin"],
    });
    expect(getRouteAccess("/admin")).toEqual({
      kind: "role",
      roles: ["admin"],
    });
  });
});

describe("canAccessPath", () => {
  const cases: [string, Role | null, boolean][] = [
    ["/menu", null, true],
    ["/profile", null, false],
    ["/profile", "customer", true],
    ["/barista", null, false],
    ["/barista", "customer", false],
    ["/barista", "barista", true],
    ["/barista", "admin", true],
    ["/admin", "customer", false],
    ["/admin", "barista", false],
    ["/admin/menu", "admin", true],
  ];

  it.each(cases)("%s as %s → %s", (path, role, expected) => {
    expect(canAccessPath(path, role)).toBe(expected);
  });
});

describe("safeNextPath / loginRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/orders/HX-1?tab=items")).toBe(
      "/orders/HX-1?tab=items",
    );
  });

  it("falls back to home for missing or off-site targets", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "orders",
    ]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });

  it("builds an encoded login link", () => {
    expect(loginRedirectPath("/orders?x=1")).toBe(
      "/login?next=%2Forders%3Fx%3D1",
    );
  });
});
