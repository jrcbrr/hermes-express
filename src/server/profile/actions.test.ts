import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    update: vi.fn(() => db),
    set: vi.fn(() => db),
    where: vi.fn(async () => undefined),
  };
  return { db, requireUser: vi.fn(), revalidatePath: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const { updateProfile } = await import("./actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
});

describe("updateProfile", () => {
  it("requires a signed-in user before anything else", async () => {
    mocks.requireUser.mockRejectedValueOnce(
      new Error("REDIRECT:/login?next=%2Fprofile"),
    );
    await expect(updateProfile({}, form({ name: "Maria" }))).rejects.toThrow(
      "REDIRECT",
    );
    expect(mocks.requireUser).toHaveBeenCalledWith("/profile");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("returns errors and the typed values when invalid", async () => {
    const state = await updateProfile(
      {},
      form({ name: "Maria", phone: "555", defaultAddress: "" }),
    );
    expect(state.errors?.phone).toMatch(/Philippine mobile number/);
    expect(state.values).toEqual({
      name: "Maria",
      phone: "555",
      defaultAddress: "",
    });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("saves only the allowed fields to the signed-in user's own row", async () => {
    const state = await updateProfile(
      {},
      form({
        name: " Maria ",
        phone: "0917 123 4567",
        defaultAddress: "12 Lontoc St, Taguig",
        role: "admin",
        id: "someone-else",
      }),
    );
    expect(state).toEqual({ status: "saved" });
    expect(mocks.db.set).toHaveBeenCalledWith({
      name: "Maria",
      phone: "+639171234567",
      defaultAddress: "12 Lontoc St, Taguig",
    });
    expect(mocks.db.where).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
