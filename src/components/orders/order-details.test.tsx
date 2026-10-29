import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderDetails as Details } from "@/server/orders/queries";

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
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

const { OrderDetails } = await import("./order-details");
const { default: OrderPage, metadata } =
  await import("@/app/(customer)/orders/[id]/page");

const ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";

const pickup: Details = {
  id: ID,
  code: "HX-7K2P",
  userId: "u1",
  branchId: "branch-bgc",
  branchName: "BGC",
  branchAddress: "High Street Kiosk, Bonifacio Global City",
  fulfillment: "pickup",
  status: "received",
  scheduledFor: null,
  contactName: "Maria Santos",
  phone: "+639171234567",
  receiptEmail: "maria@example.com",
  address: null,
  notes: "",
  subtotalCentavos: 49500,
  discountCentavos: 0,
  deliveryFeeCentavos: 0,
  pointsRedeemed: 0,
  totalCentavos: 49500,
  promoCodeId: null,
  paymentMethod: "gcash_demo",
  paymentStatus: "demo_paid",
  clientRequestId: "r1",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "i1",
      orderId: ID,
      kind: "custom",
      productId: null,
      name: "Custom Latte",
      config: { details: ["16oz", "Iced", "Latte", "Oat milk"] },
      unitPriceCentavos: 20000,
      quantity: 2,
      lineTotalCentavos: 40000,
      sortOrder: 0,
    },
    {
      id: "i2",
      orderId: ID,
      kind: "product",
      productId: "p1",
      name: "Butter Croissant",
      config: { productSlug: "butter-croissant", details: [] },
      unitPriceCentavos: 9500,
      quantity: 1,
      lineTotalCentavos: 9500,
      sortOrder: 1,
    },
  ],
};

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
    expect(screen.getByText(/9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText("Ring the bell")).toBeInTheDocument();
    expect(screen.getByText("−₱50")).toBeInTheDocument();
    expect(screen.getByText("₱49")).toBeInTheDocument();
    expect(
      screen.getByText("Cash on Delivery · Pay when your order arrives"),
    ).toBeInTheDocument();
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
