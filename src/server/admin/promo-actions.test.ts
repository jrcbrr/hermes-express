import { beforeEach, describe, expect, it, vi } from "vitest";
import { form } from "@/test/db-mock";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return {
    ...mockDb(),
    role: { current: "admin" as string | null },
  };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!mocks.role.current || !roles.includes(mocks.role.current)) {
      throw new Error("NEXT_REDIRECT");
    }
    return { id: "admin-1", role: mocks.role.current };
  }),
}));

const { createPromo, setPromoActive, updatePromo } =
  await import("./promo-actions");

const fields = {
  type: "percent",
  value: "10",
  maxDiscount: "100",
  minSubtotal: "150",
  startsAt: "2026-11-01",
  endsAt: "2026-12-31",
  maxUses: "5",
  firstOrderOnly: "on",
  isActive: "on",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.role.current = "admin";
});

describe.each(["customer", "barista", null])("as %s", (role) => {
  it("can't create, edit or switch codes", async () => {
    mocks.role.current = role;
    await expect(
      createPromo({}, form({ ...fields, code: "RAINY" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    await expect(updatePromo({}, form({ ...fields, id: "p" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    await expect(setPromoActive({ id: "p", active: false })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.state.inserted).toEqual([]);
    expect(mocks.state.sets).toEqual([]);
  });
});

describe("createPromo", () => {
  it("creates a code in capitals, with Manila dates", async () => {
    await expect(
      createPromo({}, form({ ...fields, code: "rainy" })),
    ).rejects.toThrow("REDIRECT:/admin/promos");
    const row = mocks.state.inserted[0]!;
    expect(row).toMatchObject({
      code: "RAINY",
      type: "percent",
      value: 10,
      maxDiscountCentavos: 10000,
      minSubtotalCentavos: 15000,
      maxUses: 5,
      firstOrderOnly: true,
      isActive: true,
    });
    expect((row.startsAt as Date).toISOString()).toBe(
      "2026-10-31T16:00:00.000Z",
    );
    expect((row.endsAt as Date).toISOString()).toBe("2026-12-31T15:59:59.999Z");
    expect(row).not.toHaveProperty("usedCount");
  });

  it("treats empty optional fields as none", async () => {
    await expect(
      createPromo(
        {},
        form({
          code: "PLAIN",
          type: "fixed",
          value: "50",
          maxDiscount: "",
          minSubtotal: "",
          startsAt: "",
          endsAt: "",
          maxUses: "",
        }),
      ),
    ).rejects.toThrow("REDIRECT");
    expect(mocks.state.inserted[0]).toMatchObject({
      value: 5000,
      maxDiscountCentavos: null,
      minSubtotalCentavos: 0,
      startsAt: null,
      endsAt: null,
      maxUses: null,
      isActive: false,
    });
  });

  it("returns errors and what was typed", async () => {
    const state = await createPromo(
      {},
      form({ ...fields, code: "a b", value: "500" }),
    );
    expect(state.errors?.code).toBeDefined();
    expect(state.errors?.value).toBeDefined();
    expect(state.values?.code).toBe("a b");
    expect(mocks.state.inserted).toEqual([]);
  });

  it("reports a code that already exists", async () => {
    mocks.state.insertRows = [];
    const state = await createPromo({}, form({ ...fields, code: "RAINY" }));
    expect(state.errors?.code).toBe("This code already exists.");
  });
});

describe("updatePromo", () => {
  it("saves settings, never the code or used count", async () => {
    mocks.state.selects = [[{ usedCount: 2 }]];
    const state = await updatePromo(
      {},
      form({ ...fields, id: "p1", code: "HACKED", usedCount: "0" }),
    );
    expect(state).toEqual({ status: "saved" });
    expect(mocks.state.sets[0]).toMatchObject({ value: 10, maxUses: 5 });
    expect(mocks.state.sets[0]).not.toHaveProperty("code");
    expect(mocks.state.sets[0]).not.toHaveProperty("usedCount");
  });

  it("refuses a limit below the uses so far", async () => {
    mocks.state.selects = [[{ usedCount: 6 }]];
    const state = await updatePromo({}, form({ ...fields, id: "p1" }));
    expect(state.errors?.maxUses).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("allows removing the limit", async () => {
    mocks.state.selects = [[{ usedCount: 6 }]];
    const state = await updatePromo(
      {},
      form({ ...fields, id: "p1", maxUses: "" }),
    );
    expect(state).toEqual({ status: "saved" });
  });

  it("returns validation errors", async () => {
    const state = await updatePromo(
      {},
      form({ ...fields, id: "p1", value: "abc" }),
    );
    expect(state.errors?.value).toBeDefined();
  });

  it("reports a missing code", async () => {
    mocks.state.selects = [[]];
    const state = await updatePromo({}, form({ ...fields, id: "nope" }));
    expect(state.errors?.form).toBeDefined();
  });
});

describe("setPromoActive", () => {
  it("switches a code off", async () => {
    expect(await setPromoActive({ id: "p1", active: false })).toEqual({
      ok: true,
    });
    expect(mocks.state.sets[0]).toEqual({ isActive: false });
  });

  it("rejects bad input", async () => {
    expect((await setPromoActive({ id: "" })).ok).toBe(false);
    expect(mocks.state.sets).toEqual([]);
  });

  it("reports a missing code", async () => {
    mocks.state.updateRows = [];
    expect((await setPromoActive({ id: "p", active: true })).ok).toBe(false);
  });
});
