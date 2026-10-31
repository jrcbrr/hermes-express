import { beforeEach, describe, expect, it, vi } from "vitest";
import { form } from "@/test/db-mock";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return {
    ...mockDb(),
    role: { current: "admin" as string | null },
    updateTag: vi.fn(),
  };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: vi.fn(),
}));
vi.mock("@/server/catalog/queries", () => ({ CATALOG_CACHE_TAG: "catalog" }));
vi.mock("@/server/auth/session", () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    if (!mocks.role.current || !roles.includes(mocks.role.current)) {
      throw new Error("NEXT_REDIRECT");
    }
    return { id: "admin-1", role: mocks.role.current };
  }),
}));

const { updateIngredient } = await import("./ingredient-actions");

const fields = {
  id: "i1",
  name: "Oat",
  price: "35",
  color: "#aabbcc",
  sortOrder: "3",
  isActive: "on",
};
const oat = { slug: "oat", kind: "milk", color: "#EEDDCC" };
const { isActive, ...off } = fields;
void isActive;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.role.current = "admin";
  mocks.state.selects = [[oat]];
});

describe("updateIngredient", () => {
  it.each(["customer", "barista", null])("turns away %s", async (role) => {
    mocks.role.current = role;
    await expect(updateIngredient({}, form(fields))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.state.sets).toEqual([]);
  });

  it("saves and clears the catalog cache", async () => {
    expect(await updateIngredient({}, form(fields))).toEqual({
      status: "saved",
    });
    expect(mocks.state.sets[0]).toEqual({
      name: "Oat",
      priceCentavos: 3500,
      color: "#AABBCC",
      sortOrder: 3,
      isActive: true,
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("catalog");
  });

  it("keeps the colour when none is sent", async () => {
    await updateIngredient({}, form({ ...fields, color: "" }));
    expect(mocks.state.sets[0]?.color).toBe("#EEDDCC");
  });

  it("gives no colour to an option that has none", async () => {
    mocks.state.selects = [[{ ...oat, color: null }]];
    await updateIngredient({}, form(fields));
    expect(mocks.state.sets[0]?.color).toBeNull();
  });

  it("returns validation errors", async () => {
    const state = await updateIngredient({}, form({ ...fields, price: "x" }));
    expect(state.errors?.price).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("reports a missing option", async () => {
    mocks.state.selects = [[]];
    const state = await updateIngredient({}, form(fields));
    expect(state.errors?.form).toBeDefined();
  });

  it.each(["12oz", "hot", "none"])(
    "won't switch off %s, which the builder relies on",
    async (slug) => {
      mocks.state.selects = [[{ ...oat, slug }]];
      const state = await updateIngredient({}, form(off));
      expect(state.errors?.isActive).toBeDefined();
      expect(mocks.state.sets).toEqual([]);
    },
  );

  it("won't switch off the last option of a required kind", async () => {
    mocks.state.selects = [[oat], []];
    const state = await updateIngredient({}, form(off));
    expect(state.errors?.isActive).toBeDefined();
    expect(mocks.state.sets).toEqual([]);
  });

  it("switches off a required kind's option when others remain", async () => {
    mocks.state.selects = [[oat], [{ id: "i2" }]];
    expect(await updateIngredient({}, form(off))).toEqual({ status: "saved" });
    expect(mocks.state.sets[0]?.isActive).toBe(false);
  });

  it("can switch off the last topping", async () => {
    mocks.state.selects = [[{ ...oat, kind: "topping" }]];
    expect(await updateIngredient({}, form(off))).toEqual({ status: "saved" });
  });
});
