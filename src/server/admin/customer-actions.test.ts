import { beforeEach, describe, expect, it, vi } from "vitest";
import { form } from "@/test/db-mock";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return {
    ...mockDb(),
    role: { current: "admin" as string | null },
    record: vi.fn(),
  };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/points/ledger", () => ({
  recordPointsAdjustment: mocks.record,
}));
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!mocks.role.current || !roles.includes(mocks.role.current)) {
      throw new Error("NEXT_REDIRECT");
    }
    return { id: "admin-1", role: mocks.role.current };
  }),
}));

const { adjustPoints, setUserRole, updateCustomer } =
  await import("./customer-actions");

const profile = {
  userId: "u1",
  name: "Maria Santos",
  phone: "0917 123 4567",
  defaultAddress: "BGC",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.role.current = "admin";
});

describe.each(["customer", "barista", null])("as %s", (role) => {
  beforeEach(() => {
    mocks.role.current = role;
  });

  it("can't edit, change a role or adjust points", async () => {
    await expect(updateCustomer({}, form(profile))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    await expect(
      setUserRole({}, form({ userId: "u1", role: "admin", branchId: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    await expect(
      adjustPoints({}, form({ userId: "u1", delta: "5", note: "x" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.state.sets).toEqual([]);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});

describe("updateCustomer", () => {
  it("saves a normalized profile", async () => {
    expect(await updateCustomer({}, form(profile))).toEqual({
      status: "saved",
    });
    expect(mocks.state.sets[0]).toEqual({
      name: "Maria Santos",
      phone: "+639171234567",
      defaultAddress: "BGC",
    });
  });

  it("can't change the email or role through extra fields", async () => {
    await updateCustomer(
      {},
      form({ ...profile, email: "x@y.z", role: "admin" }),
    );
    expect(mocks.state.sets[0]).not.toHaveProperty("email");
    expect(mocks.state.sets[0]).not.toHaveProperty("role");
  });

  it("returns validation errors", async () => {
    const state = await updateCustomer({}, form({ ...profile, phone: "123" }));
    expect(state.errors?.phone).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("reports a missing account", async () => {
    mocks.state.updateRows = [];
    const state = await updateCustomer({}, form(profile));
    expect(state.errors?.form).toBeDefined();
  });
});

describe("setUserRole", () => {
  it("won't let an admin change their own role", async () => {
    const state = await setUserRole(
      {},
      form({ userId: "admin-1", role: "customer", branchId: "" }),
    );
    expect(state.errors?.form).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("assigns a barista to a branch", async () => {
    mocks.state.selects = [[{ id: "b-bgc" }]];
    expect(
      await setUserRole(
        {},
        form({ userId: "u1", role: "barista", branchId: "b-bgc" }),
      ),
    ).toEqual({ status: "saved" });
    expect(mocks.state.sets[0]).toEqual({
      role: "barista",
      branchId: "b-bgc",
    });
  });

  it("needs a branch for a barista", async () => {
    const state = await setUserRole(
      {},
      form({ userId: "u1", role: "barista", branchId: "" }),
    );
    expect(state.errors?.branchId).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("rejects a branch that doesn't exist", async () => {
    mocks.state.selects = [[]];
    const state = await setUserRole(
      {},
      form({ userId: "u1", role: "barista", branchId: "nope" }),
    );
    expect(state.errors?.branchId).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("clears the branch for any other role", async () => {
    await setUserRole(
      {},
      form({ userId: "u1", role: "customer", branchId: "b-bgc" }),
    );
    expect(mocks.state.sets[0]).toEqual({ role: "customer", branchId: null });
  });

  it("reports a missing account", async () => {
    mocks.state.updateRows = [];
    const state = await setUserRole(
      {},
      form({ userId: "u1", role: "admin", branchId: "" }),
    );
    expect(state.errors?.form).toBeDefined();
  });
});

describe("adjustPoints", () => {
  const adjustment = { userId: "u1", delta: "-50", note: "Goodwill" };

  it("changes the balance and calls the ledger hook", async () => {
    expect(await adjustPoints({}, form(adjustment))).toEqual({
      status: "saved",
    });
    expect(mocks.state.sets[0]).toHaveProperty("pointsBalance");
    expect(mocks.record).toHaveBeenCalledWith({
      userId: "u1",
      delta: -50,
      note: "Goodwill",
      adminId: "admin-1",
    });
  });

  it("returns validation errors", async () => {
    const state = await adjustPoints({}, form({ ...adjustment, delta: "0" }));
    expect(state.errors?.delta).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("needs a reason", async () => {
    const state = await adjustPoints({}, form({ ...adjustment, note: "" }));
    expect(state.errors?.note).toBeDefined();
  });

  it("won't take a balance below zero, and records nothing", async () => {
    mocks.state.updateRows = [];
    const state = await adjustPoints({}, form(adjustment));
    expect(state.errors?.delta).toBeDefined();
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
