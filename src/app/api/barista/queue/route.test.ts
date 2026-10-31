// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveStaffBranch: vi.fn(),
  listBranchQueue: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/barista/branch", () => ({
  resolveStaffBranch: mocks.resolveStaffBranch,
}));
vi.mock("@/server/orders/queries", () => ({
  listBranchQueue: mocks.listBranchQueue,
}));

const { GET } = await import("./route");

const barista = { id: "b1", role: "barista", branchId: "b-tipas" };
const get = (query = "") =>
  GET(new Request(`http://localhost/api/barista/queue${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: barista });
  mocks.resolveStaffBranch.mockResolvedValue({
    current: { id: "b-tipas", slug: "tipas", name: "Tipas" },
    switchable: [],
  });
  mocks.listBranchQueue.mockResolvedValue([{ id: "o1" }]);
});

describe("GET /api/barista/queue", () => {
  it("is 401 for signed-out visitors", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mocks.listBranchQueue).not.toHaveBeenCalled();
  });

  it("is 403 for customers", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: "c", role: "customer", branchId: null },
    });
    expect((await get()).status).toBe(403);
    expect(mocks.listBranchQueue).not.toHaveBeenCalled();
  });

  it("is 404 for a barista with no branch", async () => {
    mocks.resolveStaffBranch.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });

  it("loads only the branch the resolver chose, whatever the link asks for", async () => {
    const response = await get("?branch=bgc");
    expect(mocks.resolveStaffBranch).toHaveBeenCalledWith(barista, "bgc");
    expect(mocks.listBranchQueue).toHaveBeenCalledWith("b-tipas");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orders: [{ id: "o1" }] });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
