import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedSnapshot } from "@/test/catalog-fixture";

const mocks = await vi.hoisted(async () => {
  const { mockDb } = await import("@/test/db-mock");
  return { ...mockDb(), requireUser: vi.fn(), snapshot: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/catalog/queries", () => ({
  getCatalogSnapshot: mocks.snapshot,
}));

const { previewPromo } = await import("./actions");
const { resolvePromo } = await import("./resolve");

const NOW = new Date("2026-11-15T02:00:00Z");
const promo = {
  id: "p1",
  code: "HERMES10",
  type: "percent",
  value: 10,
  maxDiscountCentavos: 10000,
  minSubtotalCentavos: 0,
  firstOrderOnly: false,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  isActive: true,
};
const items = [
  { id: "a", kind: "product", productSlug: "banana-bread", quantity: 2 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.snapshot.mockResolvedValue(seedSnapshot());
});

describe("resolvePromo", () => {
  it("finds a code typed in any case", async () => {
    mocks.state.selects = [[promo]];
    expect(await resolvePromo(" hermes10 ", "u1", 50000, NOW)).toEqual({
      ok: true,
      id: "p1",
      code: "HERMES10",
      discountCentavos: 5000,
    });
  });

  it("reports an unknown code", async () => {
    mocks.state.selects = [[]];
    const result = await resolvePromo("NOPE", "u1", 50000, NOW);
    expect(result.ok).toBe(false);
  });

  it("allows a first-order code with no earlier orders", async () => {
    mocks.state.selects = [[{ ...promo, firstOrderOnly: true }], []];
    const result = await resolvePromo("FIRST", "u1", 50000, NOW);
    expect(result.ok).toBe(true);
  });

  it("refuses a first-order code after an earlier order", async () => {
    mocks.state.selects = [
      [{ ...promo, firstOrderOnly: true }],
      [{ id: "o1" }],
    ];
    expect(await resolvePromo("FIRST", "u1", 50000, NOW)).toEqual({
      ok: false,
      message: "This code is for your first order only.",
    });
  });
});

describe("previewPromo", () => {
  it("requires login", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      previewPromo({ code: "HERMES10", branch: "bgc", items }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("works out the discount from the server's prices", async () => {
    mocks.state.selects = [[promo]];
    // ₱85 × 2 = ₱170, and 10% of that. No price comes from the browser.
    expect(
      await previewPromo({
        code: "hermes10",
        branch: "bgc",
        items,
        subtotalCentavos: 1,
      }),
    ).toEqual({
      ok: true,
      code: "HERMES10",
      discountCentavos: 1700,
      forSubtotal: 17000,
    });
  });

  it("rejects bad input", async () => {
    const result = await previewPromo({ code: "", branch: "bgc", items });
    expect(result.ok).toBe(false);
  });

  it("passes on why a code was refused", async () => {
    mocks.state.selects = [[]];
    const result = await previewPromo({ code: "NOPE", branch: "bgc", items });
    expect(result).toEqual({
      ok: false,
      message: "We could not find this code.",
    });
  });
});
