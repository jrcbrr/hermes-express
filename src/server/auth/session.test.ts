import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionApi = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: getSessionApi } }),
}));

const { getSession, requireRole, requireUser } = await import("./session");

function sessionFor(role: string) {
  return { session: { id: "s1" }, user: { id: "u1", name: "Maria", role } };
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test");
  getSessionApi.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("getSession", () => {
  it("returns null without a database instead of crashing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(getSession()).resolves.toBeNull();
    expect(getSessionApi).not.toHaveBeenCalled();
  });

  it("asks Better Auth with the request headers", async () => {
    getSessionApi.mockResolvedValueOnce(sessionFor("customer"));
    await expect(getSession()).resolves.toMatchObject({
      user: { role: "customer" },
    });
    expect(getSessionApi).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });
});

describe("requireUser", () => {
  it("sends signed-out visitors to login, remembering the page", async () => {
    getSessionApi.mockResolvedValueOnce(null);
    await expect(requireUser("/profile")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fprofile",
    );
  });

  it("returns the signed-in user", async () => {
    getSessionApi.mockResolvedValueOnce(sessionFor("customer"));
    await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
  });
});

describe("requireRole", () => {
  it("sends signed-out visitors to login", async () => {
    getSessionApi.mockResolvedValueOnce(null);
    await expect(requireRole(["admin"], "/admin")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin",
    );
  });

  it("sends users without the role home", async () => {
    getSessionApi.mockResolvedValueOnce(sessionFor("customer"));
    await expect(requireRole(["barista", "admin"], "/barista")).rejects.toThrow(
      "REDIRECT:/",
    );
  });

  it("does not let a barista into admin", async () => {
    getSessionApi.mockResolvedValueOnce(sessionFor("barista"));
    await expect(requireRole(["admin"])).rejects.toThrow("REDIRECT:/");
  });

  it("lets admins into the barista area", async () => {
    getSessionApi.mockResolvedValueOnce(sessionFor("admin"));
    await expect(requireRole(["barista", "admin"])).resolves.toMatchObject({
      role: "admin",
    });
  });
});
