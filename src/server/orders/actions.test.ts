import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { order, orderItem, orderStatusEvent } from "@/db/schema";
import type { CartItem } from "@/lib/cart";
import type { CatalogSnapshot } from "@/lib/catalog";
import type { CheckoutInput } from "@/lib/validation/checkout";
import {
  FIXTURE_NOW,
  ingredientSoldOut,
  seedSnapshot,
} from "@/test/catalog-fixture";

type Insert = { table: unknown; values: unknown };

const mocks = vi.hoisted(() => {
  const state = {
    /** Rows returned by each select(), in call order. */
    selects: [] as unknown[][],
    batches: [] as Insert[][],
    batchErrors: [] as unknown[],
    snapshot: null as CatalogSnapshot | null,
  };
  const db = {
    select: vi.fn(() => {
      const rows = state.selects.shift() ?? [];
      const chain = {
        from: () => chain,
        where: async () => rows,
      };
      return chain;
    }),
    insert: vi.fn((table: unknown) => ({
      values: (values: unknown) => ({ table, values }),
    })),
    batch: vi.fn(async (queries: Insert[]) => {
      const error = state.batchErrors.shift();
      if (error) throw error;
      state.batches.push(queries);
      return [];
    }),
  };
  return { db, state, requireUser: vi.fn() };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/catalog/queries", () => ({
  getCatalogSnapshot: async () => mocks.state.snapshot,
}));

const { placeOrder } = await import("./actions");

const BGC = {
  id: "branch-bgc",
  opensAt: "07:00",
  closesAt: "23:00",
  isActive: true,
};

const latte: CartItem = {
  id: "b",
  kind: "custom",
  config: {
    size: "16oz",
    temperature: "iced",
    iceLevel: "regular",
    base: "latte",
    milk: "oat",
    milkAmount: "regular",
    sweetness: 50,
    syrups: ["vanilla"],
    toppings: [],
  },
  quantity: 2,
};
const croissant: CartItem = {
  id: "a",
  kind: "product",
  productSlug: "butter-croissant",
  quantity: 1,
};

const input: CheckoutInput = {
  clientRequestId: "0b7c4f5e-2f4a-4c1e-9a8e-1d2c3b4a5f60",
  fulfillment: "pickup",
  branch: "bgc",
  contactName: "Maria Santos",
  phone: "0917 123 4567",
  receiptEmail: "maria@example.com",
  note: "Less ice, please",
  timing: "asap",
  paymentMethod: "gcash_demo",
  items: [croissant, latte],
};

/** The values saved for each table in the last successful batch. */
function saved() {
  const batch = mocks.state.batches.at(-1)!;
  const find = (table: unknown) => batch.find((q) => q.table === table)!.values;
  return {
    order: find(order) as Record<string, unknown>,
    items: find(orderItem) as Record<string, unknown>[],
    event: find(orderStatusEvent) as Record<string, unknown>,
  };
}

function uniqueError(constraint: string) {
  return Object.assign(new Error("Failed query"), {
    cause: { code: "23505", constraint },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXTURE_NOW); // 10:00 AM in Manila.
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  // 1st select: no earlier order with this request id; 2nd: the branch.
  mocks.state.selects = [[], [BGC]];
  mocks.state.batches = [];
  mocks.state.batchErrors = [];
  mocks.state.snapshot = seedSnapshot();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("placeOrder", () => {
  it("requires a signed-in user before anything else", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("REDIRECT:/login"));
    await expect(placeOrder(input)).rejects.toThrow("REDIRECT");
    expect(mocks.requireUser).toHaveBeenCalledWith("/checkout");
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("creates the order, its items and its first status", async () => {
    const result = await placeOrder(input);
    expect(result).toEqual({ ok: true, orderId: expect.any(String) });
    const { order: o, items, event } = saved();
    const orderId = (result as { orderId: string }).orderId;

    expect(o).toMatchObject({
      id: orderId,
      userId: "u1",
      branchId: "branch-bgc",
      fulfillment: "pickup",
      status: "received",
      scheduledFor: null,
      contactName: "Maria Santos",
      phone: "+639171234567",
      receiptEmail: "maria@example.com",
      address: null,
      notes: "Less ice, please",
      subtotalCentavos: 49500,
      discountCentavos: 0,
      deliveryFeeCentavos: 0,
      totalCentavos: 49500,
      paymentMethod: "gcash_demo",
      paymentStatus: "demo_paid",
      clientRequestId: input.clientRequestId,
    });
    expect(o.code).toMatch(/^HX-[2-9A-Z]{4}$/);

    expect(items).toEqual([
      expect.objectContaining({
        orderId,
        kind: "product",
        productId: "p-butter-croissant",
        name: "Butter Croissant",
        unitPriceCentavos: 9500,
        quantity: 1,
        lineTotalCentavos: 9500,
        sortOrder: 0,
      }),
      expect.objectContaining({
        orderId,
        kind: "custom",
        productId: null,
        name: "Custom Latte",
        config: expect.objectContaining({ drink: latte.config }),
        unitPriceCentavos: 20000,
        quantity: 2,
        lineTotalCentavos: 40000,
        sortOrder: 1,
      }),
    ]);
    expect(event).toMatchObject({
      orderId,
      status: "received",
      changedByUserId: "u1",
    });
  });

  it("ignores prices and totals sent by the browser", async () => {
    const tampered = {
      ...input,
      totalCentavos: 100,
      subtotalCentavos: 100,
      deliveryFeeCentavos: 0,
      items: [
        { ...croissant, unitPriceCentavos: 1, lineTotalCentavos: 1 },
        { ...latte, unitPriceCentavos: 1, lineTotalCentavos: 2, price: 1 },
      ],
    };
    const result = await placeOrder(tampered);
    expect(result.ok).toBe(true);
    const { order: o, items } = saved();
    expect(o.totalCentavos).toBe(49500);
    expect(items.map((i) => i.unitPriceCentavos)).toEqual([9500, 20000]);
  });

  it("uses the user from the session, never one from the browser", async () => {
    await placeOrder({ ...input, userId: "someone-else" });
    expect(saved().order.userId).toBe("u1");
  });

  it("adds the delivery fee and saves the Taguig address", async () => {
    const result = await placeOrder({
      ...input,
      fulfillment: "delivery",
      street: "Unit 5, 26th St",
      barangay: "Fort Bonifacio (BGC)",
      paymentMethod: "cod",
      items: [latte],
    });
    expect(result.ok).toBe(true);
    expect(saved().order).toMatchObject({
      address: "Unit 5, 26th St, Fort Bonifacio (BGC), Taguig City",
      subtotalCentavos: 40000,
      deliveryFeeCentavos: 4900,
      totalCentavos: 44900,
      paymentStatus: "unpaid",
    });
  });

  it("waives the delivery fee from ₱800", async () => {
    await placeOrder({
      ...input,
      fulfillment: "delivery",
      street: "Unit 5, 26th St",
      barangay: "Wawa",
      items: [{ ...latte, quantity: 4 }],
    });
    expect(saved().order).toMatchObject({
      subtotalCentavos: 80000,
      deliveryFeeCentavos: 0,
      totalCentavos: 80000,
    });
  });

  it("returns field errors for invalid details, without saving", async () => {
    expect(await placeOrder({ ...input, phone: "123" })).toMatchObject({
      ok: false,
      message: "Please check the highlighted details.",
      errors: { phone: expect.stringMatching(/Philippine mobile/) },
    });
    expect(
      await placeOrder({
        ...input,
        fulfillment: "delivery",
        street: "1 Ayala Ave",
        barangay: "Poblacion",
      }),
    ).toMatchObject({
      ok: false,
      errors: { barangay: expect.stringMatching(/Taguig City only/) },
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.db.batch).not.toHaveBeenCalled();
  });

  it("returns the same order when the same checkout arrives twice", async () => {
    mocks.state.selects = [[{ id: "order-1" }]];
    expect(await placeOrder(input)).toEqual({ ok: true, orderId: "order-1" });
    expect(mocks.db.batch).not.toHaveBeenCalled();
  });

  it("refuses inactive branches", async () => {
    mocks.state.selects = [[], [{ ...BGC, isActive: false }]];
    const result = await placeOrder(input);
    expect(result).toMatchObject({
      ok: false,
      errors: { branch: expect.stringMatching(/not taking pickup orders/) },
    });
    mocks.state.selects = [[], []];
    expect((await placeOrder(input)).ok).toBe(false);
  });

  it("refuses ASAP when the branch is closed", async () => {
    vi.setSystemTime(new Date("2026-11-15T23:30:00+08:00"));
    const result = await placeOrder(input);
    expect(result).toMatchObject({
      ok: false,
      errors: { timing: expect.stringMatching(/schedule your order/) },
    });
  });

  it("accepts an offered slot and refuses one that has passed", async () => {
    const slot = "2026-11-15T04:30:00.000Z"; // 12:30 PM in Manila.
    expect(
      (await placeOrder({ ...input, timing: "scheduled", scheduledFor: slot }))
        .ok,
    ).toBe(true);
    expect(saved().order.scheduledFor).toEqual(new Date(slot));

    mocks.state.selects = [[], [BGC]];
    const past = "2026-11-15T01:00:00.000Z"; // 9:00 AM, before now.
    const result = await placeOrder({
      ...input,
      timing: "scheduled",
      scheduledFor: past,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: { scheduledFor: expect.stringMatching(/no longer available/) },
    });
  });

  it("refuses items sold out at the branch", async () => {
    mocks.state.snapshot = seedSnapshot([ingredientSoldOut("bgc", "oat")]);
    const result = await placeOrder(input);
    expect(result).toEqual({
      ok: false,
      message: expect.stringMatching(/cannot be ordered right now/),
      problems: [
        {
          itemId: "b",
          name: "Custom Latte",
          problem: "Oat milk is sold out at BGC.",
        },
      ],
    });
    expect(mocks.db.batch).not.toHaveBeenCalled();
  });

  it("tries a new code when one is already taken", async () => {
    mocks.state.batchErrors = [uniqueError("order_code_unique")];
    const result = await placeOrder(input);
    expect(result.ok).toBe(true);
    expect(mocks.db.batch).toHaveBeenCalledTimes(2);
  });

  it("gives up politely after several taken codes", async () => {
    mocks.state.batchErrors = Array.from({ length: 5 }, () =>
      uniqueError("order_code_unique"),
    );
    expect(await placeOrder(input)).toEqual({
      ok: false,
      message: "We could not place your order. Please try again.",
    });
  });

  it("returns the order saved by a parallel request with the same checkout", async () => {
    mocks.state.selects = [[], [BGC], [{ id: "order-2" }]];
    mocks.state.batchErrors = [uniqueError("order_client_request_id_unique")];
    expect(await placeOrder(input)).toEqual({ ok: true, orderId: "order-2" });
  });

  it("lets other database errors through", async () => {
    mocks.state.batchErrors = [new Error("connection lost")];
    await expect(placeOrder(input)).rejects.toThrow("connection lost");

    mocks.state.selects = [[], [BGC], []];
    mocks.state.batchErrors = [uniqueError("order_client_request_id_unique")];
    await expect(placeOrder(input)).rejects.toThrow("Failed query");

    mocks.state.selects = [[], [BGC]];
    mocks.state.batchErrors = [
      Object.assign(new Error("dup"), { code: "23505" }),
    ];
    await expect(placeOrder(input)).rejects.toThrow("dup");
  });
});
