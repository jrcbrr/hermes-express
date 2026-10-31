import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return mockDb();
});
vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const { recordPointsAdjustment } = await import("./ledger");

const adjustment = { userId: "u1", delta: -50, note: "Goodwill" };

beforeEach(() => mocks.reset());

describe("recordPointsAdjustment", () => {
  it("writes the balance and ledger row in one guarded statement", async () => {
    expect(await recordPointsAdjustment(adjustment)).toBe(true);
    expect(mocks.state.executed).toHaveLength(1);
    const { sql, params } = new PgDialect().sqlToQuery(
      mocks.state.executed[0] as SQL,
    );
    expect(sql).toContain('update "user"');
    expect(sql).toContain("insert into points_ledger");
    expect(sql).toContain("admin_adjust");
    expect(sql).toMatch(/points_balance \+ \$\d+::int >= 0/);
    expect(params).toEqual(expect.arrayContaining(["u1", -50, "Goodwill"]));
  });

  it("is false when nothing matched", async () => {
    mocks.state.executeRows = [];
    expect(await recordPointsAdjustment(adjustment)).toBe(false);
  });
});
