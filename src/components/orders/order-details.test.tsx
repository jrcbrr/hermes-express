import { cleanup, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderDetails as Details } from "@/server/orders/queries";
import { ORDER_ID, pickupOrder } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOrderForUser: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/orders/queries", () => ({
  getOrderForUser: mocks.getOrderForUser,
  trackingForOrder: async (order: Details) => ({
    status: order.status,
    fulfillment: order.fulfillment,
    events: [],
  }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

const { OrderDetails } = await import("./order-details");
const { default: OrderPage, metadata } =
  await import("@/app/(customer)/orders/[id]/page");

const ID = ORDER_ID;
const pickup = pickupOrder;

async function renderDetails(order: Details | null) {
  mocks.getOrderForUser.mockResolvedValue(order);
  render(await OrderDetails({ params: Promise.resolve({ id: ID }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1", role: "customer" });
});

describe("OrderDetails", () => {
  it("shows the code, status, items and totals", async () => {
    await renderDetails(pickup);
    expect(mocks.requireUser).toHaveBeenCalledWith(`/orders/${ID}`);
    expect(mocks.getOrderForUser).toHaveBeenCalledWith(ID, {
      id: "u1",
      role: "customer",
    });
    expect(screen.getByTestId("order-code")).toHaveTextContent("HX-7K2P");
    expect(screen.getByTestId("order-status")).toHaveTextContent("Received");
    expect(screen.getByText("As soon as possible")).toBeInTheDocument();
    expect(screen.getByText("2 × Custom Latte")).toBeInTheDocument();
    expect(
      screen.getByText("16oz · Iced · Latte · Oat milk"),
    ).toBeInTheDocument();
    expect(screen.getByText("GCash (Demo) · Paid (demo)")).toBeInTheDocument();
    expect(
      screen.getByText("₱495", { selector: "dd.font-bold" }),
    ).toBeVisible();
    expect(screen.getByText(/No real payment was made/)).toBeVisible();
    expect(screen.queryByText("Delivery fee")).toBeNull();
    expect(screen.queryByText("Deliver to")).toBeNull();
    expect(screen.getByRole("link", { name: "View receipt" })).toHaveAttribute(
      "href",
      `/receipts/${ID}`,
    );
  });

  it("shows delivery details, a schedule, a note and a discount", async () => {
    await renderDetails({
      ...pickup,
      fulfillment: "delivery",
      address: "Unit 5, 26th St, Wawa, Taguig City",
      scheduledFor: new Date("2026-11-16T01:00:00.000Z"),
      notes: "Ring the bell",
      discountCentavos: 5000,
      deliveryFeeCentavos: 4900,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
    });
    expect(screen.getByText("Deliver to")).toBeInTheDocument();
    // The receipt on the same page repeats the time, so look in Details.
    expect(
      within(screen.getByRole("region", { name: "Details" })).getByText(
        /9:00 AM/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ring the bell")).toBeInTheDocument();
    expect(screen.getByText("−₱50")).toBeInTheDocument();
    expect(screen.getByText("₱49")).toBeInTheDocument();
    expect(
      screen.getByText("Cash on Delivery · Pay when your order arrives"),
    ).toBeInTheDocument();
  });

  it("shows the tracker and the receipt on the page", async () => {
    await renderDetails(pickup);
    expect(screen.getByTestId("order-tracker")).toBeInTheDocument();
    expect(screen.getByText("SALES RECEIPT")).toBeInTheDocument();
    expect(screen.getByTestId("receipt-number")).toHaveTextContent(
      "HX-BGC-000123",
    );
  });

  it("thanks only the customer who placed the order", async () => {
    await renderDetails(pickup);
    expect(screen.getByText(/Thank you\./)).toBeInTheDocument();
    cleanup();
    mocks.requireUser.mockResolvedValue({ id: "staff", role: "barista" });
    await renderDetails(pickup);
    expect(screen.queryByText(/Thank you\./)).toBeNull();
  });

  it("shows free delivery", async () => {
    await renderDetails({ ...pickup, fulfillment: "delivery" });
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("is not found for someone else's or a missing order", async () => {
    await expect(renderDetails(null)).rejects.toThrow("NOT_FOUND");
  });
});

describe("/orders/[id] page", () => {
  it("has a title and heading", () => {
    expect(metadata).toEqual({ title: "Your order" });
    mocks.getOrderForUser.mockResolvedValue(pickup);
    render(
      <OrderPage
        params={Promise.resolve({ id: ID })}
        searchParams={Promise.resolve({})}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Your order" }),
    ).toBeVisible();
  });
});
