import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set }),
}));

const { selectBranch } = await import("./actions");

function form(branch?: string): FormData {
  const data = new FormData();
  if (branch !== undefined) data.set("branch", branch);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("selectBranch", () => {
  // Not HTTP-only: the browser rewrites it when switching branches instantly.
  it("stores a known branch in a long-lived cookie the browser can update", async () => {
    await selectBranch(form("bgc"));
    expect(mocks.set).toHaveBeenCalledWith("hx_menu_branch", "bgc", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: false,
    });
  });

  it("marks the cookie secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await selectBranch(form("tipas"));
    expect(mocks.set).toHaveBeenCalledWith(
      "hx_menu_branch",
      "tipas",
      expect.objectContaining({ secure: true }),
    );
  });

  it.each([undefined, "", "makati", "BGC"])(
    "ignores an unknown branch %j",
    async (branch) => {
      await selectBranch(form(branch));
      expect(mocks.set).not.toHaveBeenCalled();
    },
  );
});
