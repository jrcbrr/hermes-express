import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StockItem } from "@/lib/stock";
import type { QueueOrder } from "@/server/orders/queries";

const mocks = vi.hoisted(() => ({
  play: vi.fn(),
  advanceOrder: vi.fn(),
  setSoldOut: vi.fn(),
}));

vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play: mocks.play, muted: false, toggleMuted: vi.fn() }),
}));
vi.mock("@/server/barista/actions", () => ({
  advanceOrder: mocks.advanceOrder,
  setSoldOut: mocks.setSoldOut,
}));

const { QueueBoard } = await import("./queue-board");
const { StockToggle } = await import("./stock-toggle");

const order = (over: Partial<QueueOrder> = {}): QueueOrder => ({
  id: "o1",
  code: "HX-AAAA",
  status: "received",
  fulfillment: "pickup",
  scheduledFor: null,
  createdAt: "2026-10-30T01:15:00.000Z",
  contactName: "Maria Santos",
  phone: "+639171234567",
  address: null,
  notes: "",
  items: [{ id: "i1", name: "Latte", quantity: 2, details: ["16oz"] }],
  ...over,
});

const fetchMock = vi.fn();

function polled(orders: QueueOrder[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ orders }) });
}
const showBoard = (orders: QueueOrder[]) =>
  render(<QueueBoard branchSlug="bgc" initialOrders={orders} />);
const poll = () => act(() => vi.advanceTimersByTimeAsync(10_000));
const group = (status: string) => screen.getByTestId(`queue-group-${status}`);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  mocks.advanceOrder.mockResolvedValue({ ok: true });
  mocks.setSoldOut.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("QueueBoard", () => {
  it("groups orders under their status, with details", () => {
    showBoard([
      order({ notes: "Less ice", phone: "+639000000000" }),
      order({
        id: "o2",
        code: "HX-BBBB",
        status: "brewing",
        fulfillment: "delivery",
        address: "26th St, Taguig",
      }),
    ]);
    expect(within(group("received")).getByText("HX-AAAA")).toBeVisible();
    expect(within(group("received")).getByText("Pickup")).toBeVisible();
    expect(within(group("received")).getByText(/Less ice/)).toBeVisible();
    expect(within(group("received")).getByText("2 × Latte")).toBeVisible();
    expect(within(group("brewing")).getByText("HX-BBBB")).toBeVisible();
    expect(within(group("brewing")).getByText("26th St, Taguig")).toBeVisible();
    expect(
      within(group("ready_for_pickup")).getByText("No orders."),
    ).toBeVisible();
  });

  it("marks scheduled orders only", () => {
    showBoard([
      order({ scheduledFor: "2026-11-16T01:00:00.000Z" }),
      order({ id: "o2", code: "HX-BBBB" }),
    ]);
    const marks = screen.getAllByTestId("queue-scheduled");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent(/Scheduled:.*9:00 AM/);
  });

  it("toasts and dings for a new order, but not for the first load or repeats", async () => {
    const first = order();
    showBoard([first]);
    polled([first]);
    await poll();
    expect(screen.getByTestId("queue-toast")).toBeEmptyDOMElement();
    expect(mocks.play).not.toHaveBeenCalled();

    polled([first, order({ id: "o2", code: "HX-NEWW" })]);
    await poll();
    expect(screen.getByTestId("queue-toast")).toHaveTextContent(
      "New order: HX-NEWW",
    );
    expect(mocks.play).toHaveBeenCalledExactlyOnceWith("ding");
    expect(within(group("received")).getByText("HX-NEWW")).toBeVisible();

    await poll();
    expect(mocks.play).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(6_000));
    expect(screen.getByTestId("queue-toast")).toBeEmptyDOMElement();
  });

  it("counts several new orders in one toast", async () => {
    showBoard([]);
    polled([order(), order({ id: "o2", code: "HX-BBBB" })]);
    await poll();
    expect(screen.getByTestId("queue-toast")).toHaveTextContent("2 new orders");
  });

  it("moves an order with one tap, along its own path", async () => {
    polled([order({ status: "ready_for_pickup" })]);
    showBoard([order({ status: "brewing" })]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Mark ready for pickup" }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.advanceOrder).toHaveBeenCalledWith({
      orderId: "o1",
      to: "ready_for_pickup",
    });
    expect(
      within(group("ready_for_pickup")).getByText("HX-AAAA"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("offers Out for delivery on delivery orders", () => {
    showBoard([order({ status: "brewing", fulfillment: "delivery" })]);
    expect(
      screen.getByRole("button", { name: "Send out for delivery" }),
    ).toBeVisible();
  });

  it("takes a completed order off the board", async () => {
    polled([]);
    showBoard([order({ status: "ready_for_pickup" })]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByText("HX-AAAA")).toBeNull();
  });

  it("shows why a move failed", async () => {
    polled([order()]);
    mocks.advanceOrder.mockResolvedValue({
      ok: false,
      message: "This order was just updated.",
    });
    showBoard([order()]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start brewing" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("just updated");
  });

  it("asks before cancelling, and only offers it before the drink leaves", async () => {
    polled([]);
    showBoard([order()]);
    expect(mocks.advanceOrder).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep order" }));
    expect(mocks.advanceOrder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm cancel" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.advanceOrder).toHaveBeenCalledWith({
      orderId: "o1",
      to: "cancelled",
    });
    expect(screen.queryByText("HX-AAAA")).toBeNull();
  });

  it("has no cancel once an order is ready", () => {
    showBoard([order({ status: "ready_for_pickup" })]);
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  });

  it("says so when the queue can't refresh", async () => {
    showBoard([order()]);
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await poll();
    expect(screen.getByRole("alert")).toHaveTextContent(/could not refresh/);
    expect(screen.getByText("HX-AAAA")).toBeVisible();
  });
});

describe("StockToggle", () => {
  const item: StockItem = {
    id: "i-oat",
    name: "Oat milk",
    isSoldOut: false,
    blockedBy: [],
  };
  const showToggle = (over: Partial<StockItem> = {}) =>
    render(
      <ul>
        <StockToggle
          item={{ ...item, ...over }}
          kind="ingredient"
          branchId="b-bgc"
        />
      </ul>,
    );

  it("marks an item sold out", async () => {
    showToggle();
    const toggle = screen.getByRole("switch", { name: "Oat milk sold out" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await act(async () => {
      fireEvent.click(toggle);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Sold out")).toBeVisible();
    expect(mocks.setSoldOut).toHaveBeenCalledWith({
      branchId: "b-bgc",
      kind: "ingredient",
      itemId: "i-oat",
      soldOut: true,
    });
  });

  it("flips back and explains when saving fails", async () => {
    mocks.setSoldOut.mockResolvedValue({ ok: false, message: "No." });
    showToggle({ isSoldOut: true });
    const toggle = screen.getByRole("switch");
    await act(async () => {
      fireEvent.click(toggle);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("No.");
  });

  it("says which ingredient blocks a drink", () => {
    showToggle({ blockedBy: ["Oat milk", "Honey"] });
    expect(
      screen.getByText("Unavailable because Oat milk, Honey are sold out."),
    ).toBeVisible();
  });
});
