import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildReceipt } from "@/lib/receipt";
import { ORDER_ID, deliveryOrder, pickupOrder } from "@/test/order-fixture";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOrderForUser: vi.fn(),
  listReceiptsForUser: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/orders/queries", () => ({
  getOrderForUser: mocks.getOrderForUser,
  listReceiptsForUser: mocks.listReceiptsForUser,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

const { ReceiptView } = await import("./receipt-view");
const { ReceiptDetails } = await import("./receipt-details");
const { ReceiptList } = await import("./receipt-list");
const { default: ReceiptsPage, metadata: listMetadata } =
  await import("@/app/(customer)/receipts/page");
const { default: ReceiptPage, metadata: receiptMetadata } =
  await import("@/app/(customer)/receipts/[id]/page");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1", role: "customer" });
});

describe("ReceiptView", () => {
  it("shows the header, details, items, totals with VAT, payment and footer", () => {
    render(<ReceiptView receipt={buildReceipt(pickupOrder)} />);
    expect(
      screen.getByRole("heading", { name: "Hermes Express" }),
    ).toBeVisible();
    expect(
      screen.getByText("BGC · High Street Kiosk, Bonifacio Global City"),
    ).toBeVisible();
    expect(screen.getByText("Phone 0939 008 2560")).toBeVisible();
    expect(screen.getByText("TIN 000-000-000-000")).toBeVisible();
    expect(screen.getByTestId("receipt-number")).toHaveTextContent(
      "HX-BGC-000123",
    );
    expect(screen.getByText("Oct 30, 2026, 9:15 AM")).toBeVisible();
    expect(screen.getByText("As soon as possible")).toBeVisible();
    expect(screen.getByText("0917 123 4567")).toBeVisible();

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent(
      "Custom Latte16oz · Iced · Latte · Oat milk2₱200₱400",
    );
    expect(rows[2]).toHaveTextContent("Butter Croissant1₱95₱95");

    expect(screen.getByTestId("receipt-total")).toHaveTextContent("₱495");
    expect(screen.getByText("₱441.96")).toBeVisible();
    expect(screen.getByText("₱53.04")).toBeVisible();
    expect(screen.getByText("GCash (Demo)")).toBeVisible();
    expect(screen.getByText("Paid")).toBeVisible();
    expect(screen.queryByText("Delivery fee")).toBeNull();
    expect(screen.queryByText("Deliver to")).toBeNull();
    expect(
      screen.getByText("Demo receipt. Not an official receipt."),
    ).toBeVisible();
  });

  it("shows the delivery address, fee and promo discount", () => {
    render(<ReceiptView receipt={buildReceipt(deliveryOrder)} />);
    expect(
      screen.getByText("Unit 5, 26th St, Wawa, Taguig City"),
    ).toBeVisible();
    expect(screen.getByText("Discount (FIRSTSIP)")).toBeVisible();
    expect(screen.getByText("−₱50")).toBeVisible();
    expect(screen.getByText("₱49")).toBeVisible();
    expect(screen.getByText("To be paid on delivery")).toBeVisible();
  });

  it("shows free delivery and a discount without a code", () => {
    render(
      <ReceiptView
        receipt={buildReceipt({
          ...deliveryOrder,
          promoCode: null,
          deliveryFeeCentavos: 0,
        })}
      />,
    );
    expect(screen.getByText("Free")).toBeVisible();
    expect(screen.getByText("Discount")).toBeVisible();
  });
});

describe("ReceiptDetails", () => {
  it("shows the receipt with a PDF download for the signed-in owner", async () => {
    mocks.getOrderForUser.mockResolvedValue(pickupOrder);
    render(await ReceiptDetails({ params: Promise.resolve({ id: ORDER_ID }) }));
    expect(mocks.requireUser).toHaveBeenCalledWith(`/receipts/${ORDER_ID}`);
    expect(mocks.getOrderForUser).toHaveBeenCalledWith(ORDER_ID, {
      id: "u1",
      role: "customer",
    });
    const download = screen.getByRole("link", { name: "Download PDF" });
    expect(download).toHaveAttribute("href", `/api/receipts/${ORDER_ID}/pdf`);
    expect(download).toHaveAttribute("download", "HX-BGC-000123.pdf");
    expect(screen.getByRole("link", { name: "View order" })).toHaveAttribute(
      "href",
      `/orders/${ORDER_ID}`,
    );
  });

  it("is not found for someone else's or a missing order", async () => {
    mocks.getOrderForUser.mockResolvedValue(null);
    await expect(
      ReceiptDetails({ params: Promise.resolve({ id: ORDER_ID }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("ReceiptList", () => {
  it("lists the user's receipts with links", async () => {
    mocks.listReceiptsForUser.mockResolvedValue([
      {
        id: ORDER_ID,
        receiptNumber: 123,
        branchSlug: "bgc",
        branchName: "BGC",
        fulfillment: "pickup",
        totalCentavos: 49500,
        createdAt: new Date("2026-10-30T01:15:00.000Z"),
      },
    ]);
    render(await ReceiptList());
    expect(mocks.requireUser).toHaveBeenCalledWith("/receipts");
    expect(mocks.listReceiptsForUser).toHaveBeenCalledWith("u1");
    const link = screen.getByRole("link", { name: /HX-BGC-000123/ });
    expect(link).toHaveAttribute("href", `/receipts/${ORDER_ID}`);
    expect(link).toHaveTextContent("Oct 30, 2026, 9:15 AM · BGC · Pickup");
    expect(link).toHaveTextContent("₱495");
  });

  it("explains when there are no receipts yet", async () => {
    mocks.listReceiptsForUser.mockResolvedValue([]);
    render(await ReceiptList());
    expect(screen.getByText(/You have no receipts yet/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Browse the menu" }),
    ).toHaveAttribute("href", "/menu");
  });
});

describe("receipt pages", () => {
  it("/receipts has a title and heading", () => {
    expect(listMetadata).toEqual({ title: "Your receipts" });
    mocks.listReceiptsForUser.mockResolvedValue([]);
    render(<ReceiptsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your receipts" }),
    ).toBeVisible();
  });

  it("/receipts/[id] has a title and heading", () => {
    expect(receiptMetadata).toEqual({ title: "Receipt" });
    mocks.getOrderForUser.mockResolvedValue(pickupOrder);
    render(
      <ReceiptPage
        params={Promise.resolve({ id: ORDER_ID })}
        searchParams={Promise.resolve({})}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Receipt" }),
    ).toBeInTheDocument();
  });
});
