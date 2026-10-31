import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderStatus } from "@/lib/order-status";
import type { OrderTracking } from "@/server/orders/queries";

const mocks = vi.hoisted(() => ({ play: vi.fn(), reduced: false }));

vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play: mocks.play, muted: false, toggleMuted: vi.fn() }),
}));
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  useReducedMotion: () => mocks.reduced,
}));

const { OrderTracker } = await import("./order-tracker");

const tracking = (
  status: OrderStatus,
  fulfillment: OrderTracking["fulfillment"] = "pickup",
): OrderTracking => ({
  status,
  fulfillment,
  events: [{ status: "received", at: "2026-10-30T01:15:00.000Z" }],
});

const show = (t: OrderTracking) =>
  render(<OrderTracker orderId="o1" initial={t} />);

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.reduced = false;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function pollReturns(t: OrderTracking) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => t });
  await act(() => vi.advanceTimersByTimeAsync(10_000));
}

describe("OrderTracker", () => {
  it("shows the pickup path with the current step marked", () => {
    show(tracking("brewing"));
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining("Received"),
      "Brewing",
      "Ready for pickup",
      "Completed",
    ]);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("order-status")).toHaveTextContent("Brewing");
    expect(screen.getByText("9:15 AM")).toBeInTheDocument();
  });

  it("shows Out for delivery on the delivery path, with flapping wings", () => {
    show(tracking("out_for_delivery", "delivery"));
    expect(
      within(screen.getByRole("list")).getByText("Out for delivery"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ready for pickup")).toBeNull();
    expect(screen.getByTestId("tracker-mascot")).toHaveAttribute(
      "data-step",
      "2",
    );
    expect(screen.getByTestId("mascot-wing-flap")).toHaveClass("hx-wing-flap");
  });

  it("flaps only when out for delivery", () => {
    show(tracking("brewing", "delivery"));
    expect(screen.queryByTestId("mascot-wing-flap")).toBeNull();
  });

  it("keeps the cup empty until brewing starts", () => {
    const { unmount } = show(tracking("received"));
    expect(screen.getByTestId("tracker-cup")).toHaveAttribute(
      "data-fill",
      "empty",
    );
    unmount();
    show(tracking("brewing"));
    expect(screen.getByTestId("tracker-cup")).toHaveAttribute(
      "data-fill",
      "full",
    );
  });

  it("renders the same content under reduced motion", () => {
    mocks.reduced = true;
    show(tracking("brewing"));
    expect(screen.getByTestId("tracker-mascot")).toHaveAttribute(
      "data-step",
      "1",
    );
    expect(screen.getByTestId("tracker-cup")).toBeInTheDocument();
  });

  it("shows a cancelled order without the path, and stops polling", async () => {
    show(tracking("cancelled"));
    expect(screen.getByTestId("order-status")).toHaveTextContent("Cancelled");
    expect(screen.getByRole("status")).toHaveTextContent(/cancelled/);
    expect(screen.queryByTestId("tracker-mascot")).toBeNull();
    await pollReturns(tracking("cancelled"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates and dings when the status changes, and only then", async () => {
    show(tracking("received"));
    await pollReturns(tracking("received"));
    expect(mocks.play).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/o1/status",
      expect.anything(),
    );

    await pollReturns(tracking("brewing"));
    expect(screen.getByTestId("order-status")).toHaveTextContent("Brewing");
    expect(mocks.play).toHaveBeenCalledExactlyOnceWith("ding");
  });

  it("stops polling once the order is completed", async () => {
    show(tracking("ready_for_pickup"));
    await pollReturns(tracking("completed"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says so when a refresh fails, keeping the last status", async () => {
    show(tracking("brewing"));
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.getByText(/could not refresh/)).toBeInTheDocument();
    expect(screen.getByTestId("order-status")).toHaveTextContent("Brewing");
  });
});
