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
  it("prints the header, details, items, totals, VAT breakdown, buyer and footer", () => {
    render(<ReceiptView receipt={buildReceipt(pickupOrder)} />);
    expect(
      screen.getByRole("heading", { name: "HERMES EXPRESS" }),
    ).toBeVisible();
    expect(
      screen.getByText("BGC · High Street Kiosk, Bonifacio Global City"),
    ).toBeVisible();
    expect(screen.getByText("Tel. 0939 008 2560")).toBeVisible();
    expect(screen.getByText("VAT REG TIN 000-000-000-000")).toBeVisible();
    expect(screen.getByText("SALES RECEIPT")).toBeVisible();

    const details = screen.getByTestId("receipt-details");
    expect(details).toHaveTextContent(
      "Receipt No.HX-BGC-000123Order CodeHX-7K2PDate/Time10/30/2026 09:15 AMServicePICKUP (ASAP)",
    );
    expect(screen.getByTestId("receipt-number")).toHaveTextContent(
      "HX-BGC-000123",
    );

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("QTYDESCRIPTIONAMOUNT");
    expect(rows[1]).toHaveTextContent(
      "2CUSTOM LATTE@200.00 16oz / Iced / Latte / Oat milk400.00",
    );
    expect(rows[2]).toHaveTextContent("1BUTTER CROISSANT@95.0095.00");

    expect(screen.getByText("SUBTOTAL").nextSibling).toHaveTextContent(
      "495.00",
    );
    expect(screen.getByTestId("receipt-total")).toHaveTextContent("PHP 495.00");
    expect(screen.getByTestId("receipt-vat")).toHaveTextContent(
      "VATable Sales441.96VAT-Exempt Sales0.00Zero-Rated Sales0.00VAT Amount (12%)53.04",
    );
    expect(screen.getByText("PAYMENT: GCASH (DEMO)")).toBeVisible();
    expect(screen.getByText("PAID")).toBeVisible();
    expect(screen.getByText("SOLD TO").nextSibling).toHaveTextContent(
      "Maria Santos",
    );
    expect(screen.getByText("0917 123 4567")).toBeVisible();
    expect(screen.queryByText("DELIVERY FEE")).toBeNull();
    expect(screen.queryByText("Address")).toBeNull();
    expect(
      screen.getByText("DEMO RECEIPT. NOT AN OFFICIAL RECEIPT."),
    ).toBeVisible();
  });

  it("prints the delivery address, fee and promo discount", () => {
    render(<ReceiptView receipt={buildReceipt(deliveryOrder)} />);
    expect(screen.getByText("Service").nextSibling).toHaveTextContent(
      "DELIVERY (SCHEDULED 10/31/2026 09:00 AM)",
    );
    expect(
      screen.getByText("LESS: DISCOUNT (FIRSTSIP)").nextSibling,
    ).toHaveTextContent("-50.00");
    expect(screen.getByText("DELIVERY FEE").nextSibling).toHaveTextContent(
      "49.00",
    );
    expect(screen.getByText("Address").nextSibling).toHaveTextContent(
      "Unit 5, 26th St, Wawa, Taguig City",
    );
    expect(screen.getByText("TO BE PAID ON DELIVERY")).toBeVisible();
  });

  it("prints FREE delivery and a discount without a code", () => {
    render(
      <ReceiptView
        receipt={buildReceipt({
          ...deliveryOrder,
          promoCode: null,
          deliveryFeeCentavos: 0,
        })}
      />,
    );
    expect(screen.getByText("FREE")).toBeVisible();
    expect(screen.getByText("LESS: DISCOUNT")).toBeVisible();
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
    expect(link).toHaveTextContent("10/30/2026 09:15 AM · BGC · Pickup");
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
