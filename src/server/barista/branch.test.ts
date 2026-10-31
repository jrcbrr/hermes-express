import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { rows: [] as unknown[] };
  const db = {
    select: () => ({
      from: () => ({ orderBy: async () => state.rows }),
    }),
  };
  return { db, state };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const { resolveStaffBranch } = await import("./branch");

const bgc = { id: "b-bgc", slug: "bgc", name: "BGC" };
const tipas = { id: "b-tipas", slug: "tipas", name: "Tipas" };

beforeEach(() => {
  mocks.state.rows = [bgc, tipas];
});

describe("resolveStaffBranch", () => {
  it("always gives a barista their own branch, whatever the link says", async () => {
    const barista = { role: "barista", branchId: "b-tipas" };
    expect(await resolveStaffBranch(barista, "bgc")).toEqual({
      current: tipas,
      switchable: [],
    });
    expect(await resolveStaffBranch(barista, null)).toEqual({
      current: tipas,
      switchable: [],
    });
  });

  it("has nothing for a barista with no branch, or for a customer", async () => {
    expect(
      await resolveStaffBranch({ role: "barista", branchId: null }, "bgc"),
    ).toBeNull();
    expect(
      await resolveStaffBranch({ role: "customer", branchId: "b-bgc" }, "bgc"),
    ).toBeNull();
  });

  it("lets an admin pick any branch, starting with the first", async () => {
    const admin = { role: "admin", branchId: null };
    expect((await resolveStaffBranch(admin, "tipas"))?.current).toEqual(tipas);
    expect((await resolveStaffBranch(admin, "nowhere"))?.current).toEqual(bgc);
    expect((await resolveStaffBranch(admin, null))?.switchable).toEqual([
      bgc,
      tipas,
    ]);
  });

  it("has nothing for an admin when no branches exist", async () => {
    mocks.state.rows = [];
    expect(
      await resolveStaffBranch({ role: "admin", branchId: null }, null),
    ).toBeNull();
  });
});
