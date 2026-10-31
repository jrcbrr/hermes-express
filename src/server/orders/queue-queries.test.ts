import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { selects: [] as unknown[][] };
  const db = {
    select: vi.fn(() => {
      const rows = state.selects.shift() ?? [];
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: () => Object.assign(Promise.resolve(rows), chain),
        orderBy: async () => rows,
      };
      return chain;
    }),
  };
  return { db, state };
});

vi.mock("@/db", () => ({ getDb: () => mocks.db }));

const { getOrderTracking, listBranchQueue } = await import("./queries");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";
const CREATED = new Date("2026-10-30T01:15:00.000Z");
const SLOT = new Date("2026-10-30T03:00:00.000Z");

describe("getOrderTracking", () => {
  const row = {
    order: {
      id: ID,
      userId: "u1",
      branchId: "b-bgc",
      status: "brewing",
      fulfillment: "pickup",
    },
    branchSlug: "bgc",
    branchName: "BGC",
    branchAddress: "x",
    promoCode: null,
  };

  beforeEach(() => {
    mocks.state.selects = [
      [row],
      [],
      [
        { status: "received", createdAt: CREATED },
        { status: "brewing", createdAt: SLOT },
      ],
    ];
  });

  it("gives the owner the status and history", async () => {
    expect(
      await getOrderTracking(ID, {
        id: "u1",
        role: "customer",
        branchId: null,
      }),
    ).toEqual({
      status: "brewing",
      fulfillment: "pickup",
      events: [
        { status: "received", at: CREATED.toISOString() },
        { status: "brewing", at: SLOT.toISOString() },
      ],
    });
  });

  it("gives another branch's barista nothing", async () => {
    expect(
      await getOrderTracking(ID, {
        id: "b",
        role: "barista",
        branchId: "b-tipas",
      }),
    ).toBeNull();
  });
});

describe("listBranchQueue", () => {
  it("skips the items query when the queue is empty", async () => {
    mocks.state.selects = [[]];
    mocks.db.select.mockClear();
    expect(await listBranchQueue("b1")).toEqual([]);
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it("attaches each order's items and turns dates into strings", async () => {
    const base = {
      code: "HX-AAAA",
      status: "received",
      fulfillment: "pickup",
      createdAt: CREATED,
      contactName: "Maria",
      phone: "+639171234567",
      address: null,
      notes: "",
    };
    mocks.state.selects = [
      [
        { ...base, id: "o1", scheduledFor: SLOT },
        { ...base, id: "o2", scheduledFor: null },
      ],
      [
        {
          id: "i1",
          orderId: "o1",
          name: "Latte",
          quantity: 2,
          config: { details: ["16oz"] },
        },
      ],
    ];
    const [first, second] = await listBranchQueue("b1");
    expect(first).toMatchObject({
      id: "o1",
      scheduledFor: SLOT.toISOString(),
      createdAt: CREATED.toISOString(),
      items: [{ id: "i1", name: "Latte", quantity: 2, details: ["16oz"] }],
    });
    expect(second).toMatchObject({ id: "o2", scheduledFor: null, items: [] });
  });
});
