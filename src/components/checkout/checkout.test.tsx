import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/cart";
import type { CatalogSnapshot } from "@/lib/catalog";
import {
  FIXTURE_NOW,
  ingredientSoldOut,
  seedSnapshot,
} from "@/test/catalog-fixture";

const mocks = vi.hoisted(() => ({
  placeOrder: vi.fn(),
  routerPush: vi.fn(),
  requireUser: vi.fn(),
  branch: "bgc",
  catalog: null as CatalogSnapshot | null,
}));

vi.mock("@/server/orders/actions", () => ({ placeOrder: mocks.placeOrder }));
vi.mock("@/server/cart/actions", () => ({ saveCart: vi.fn(async () => {}) }));
vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/catalog/queries", () => ({
  getSelectedBranchSlug: async () => mocks.branch,
  loadCatalog: async () => mocks.catalog,
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

const { CheckoutForm, PROCESSING_MS } = await import("./checkout-form");
const { CheckoutContent } = await import("./checkout-content");
const { default: CheckoutPage, metadata } =
  await import("@/app/(customer)/checkout/page");

const latte: CartItem = {
  id: "b",
  kind: "custom",
  config: {
    size: "12oz",
    temperature: "hot",
    base: "latte",
    shots: 1,
    milk: "whole",
    milkAmount: "regular",
    sweetness: 50,
    syrups: [],
    toppings: [],
  },
  quantity: 2,
};

const slots = [
  "2026-11-15T02:30:00.000Z", // Today, 10:30 AM
  "2026-11-16T01:00:00.000Z", // Tomorrow, 9:00 AM
];
const timings = {
  tipas: { asap: true, slots },
  bgc: { asap: true, slots },
  "taguig-lakeshore": { asap: false, slots },
};

function storeCart(items: CartItem[]) {
  window.localStorage.setItem(
    "hx_cart",
    JSON.stringify({ owner: "u1", items }),
  );
}

function renderForm(snapshot = seedSnapshot()) {
  return render(
    <CheckoutForm
      snapshot={snapshot}
      now={FIXTURE_NOW}
      initialBranch="bgc"
      timings={timings}
      defaults={{
        contactName: "Maria Santos",
        phone: "0917 123 4567",
        receiptEmail: "maria@example.com",
      }}
    />,
  );
}

const payButton = () =>
  screen.getByRole("button", { name: /^(Pay|Place order)/ });

beforeEach(() => {
  mocks.placeOrder.mockReset();
  mocks.routerPush.mockReset();
  mocks.requireUser.mockResolvedValue({
    id: "u1",
    name: "Maria Santos",
    email: "maria@example.com",
    phone: "+639171234567",
  });
  mocks.catalog = seedSnapshot();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CheckoutForm", () => {
  it("asks for items when the cart is empty", () => {
    renderForm();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("shows the order, demo notice and pickup total", () => {
    storeCart([latte]);
    renderForm();
    expect(
      screen.getByText(/No real payment is made, and no card/),
    ).toBeVisible();
    expect(screen.getByText("2 × Custom Latte")).toBeInTheDocument();
    expect(screen.getByTestId("delivery-fee")).toHaveTextContent("Pickup");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("₱260");
    expect(payButton()).toHaveTextContent("Pay ₱260 (demo)");
    expect(screen.getByLabelText("Name")).toHaveValue("Maria Santos");
    expect(screen.queryByLabelText("Barangay")).toBeNull();
    expect(
      screen.queryByRole("radio", { name: /Cash on Delivery/ }),
    ).toBeNull();
  });

  it("adds delivery: address fields, the fee and cash on delivery", () => {
    storeCart([latte]);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /^Delivery/ }));
    expect(screen.getByLabelText("Barangay")).toBeInTheDocument();
    expect(screen.getByTestId("delivery-fee")).toHaveTextContent("₱49");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("₱309");
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/ }));
    expect(payButton()).toHaveTextContent("Place order · ₱309");

    // Back to pickup: cash is no longer offered, so GCash is chosen again.
    fireEvent.click(screen.getByRole("radio", { name: /^Pickup/ }));
    expect(screen.getByRole("radio", { name: /GCash/ })).toBeChecked();
  });

  it("shows free delivery from ₱800", () => {
    storeCart([{ ...latte, quantity: 7 }]);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /^Delivery/ }));
    expect(screen.getByTestId("delivery-fee")).toHaveTextContent("Free");
  });

  it("offers grouped time slots, and only scheduling when a branch is closed", () => {
    storeCart([latte]);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /Schedule for later/ }));
    const time = screen.getByLabelText("Time");
    expect(
      within(time).getByRole("group", { name: "Today" }),
    ).toBeInTheDocument();
    expect(
      within(time).getByRole("option", { name: "Tomorrow, 9:00 AM" }),
    ).toBeInTheDocument();
    fireEvent.change(time, { target: { value: slots[1] } });
    expect(time).toHaveValue(slots[1]);

    fireEvent.click(screen.getByRole("radio", { name: /Taguig Lakeshore/ }));
    expect(
      screen.getByRole("radio", { name: /As soon as possible/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Taguig Lakeshore is closed right now/),
    ).toBeVisible();
    expect(document.cookie).toContain("hx_menu_branch=taguig-lakeshore");
  });

  it("shows errors in the browser before sending anything", () => {
    storeCart([latte]);
    renderForm();
    fireEvent.change(screen.getByLabelText("Mobile number"), {
      target: { value: "123" },
    });
    fireEvent.click(payButton());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please check the highlighted details.",
    );
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mocks.placeOrder).not.toHaveBeenCalled();
  });

  it("checks the delivery address", () => {
    storeCart([latte]);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /^Delivery/ }));
    fireEvent.change(screen.getByLabelText(/House or unit number/), {
      target: { value: "Unit 5, 26th St" },
    });
    fireEvent.click(payButton());
    expect(screen.getAllByText(/choose your barangay/).length).toBeGreaterThan(
      0,
    );
    fireEvent.change(screen.getByLabelText("Barangay"), {
      target: { value: "Fort Bonifacio (BGC)" },
    });
    fireEvent.change(screen.getByLabelText(/Note for the barista/), {
      target: { value: "Ring the bell" },
    });
  });

  it("shows the demo payment screen, places the order and opens it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    storeCart([latte]);
    mocks.placeOrder.mockResolvedValue({ ok: true, orderId: "order-1" });
    renderForm();
    fireEvent.click(payButton());

    expect(
      screen.getByText("Processing your payment with GCash (Demo)…"),
    ).toBeVisible();
    expect(screen.getByText(/No real payment is made/)).toBeVisible();
    const sent = mocks.placeOrder.mock.calls[0]![0];
    expect(sent).toMatchObject({
      fulfillment: "pickup",
      branch: "bgc",
      timing: "asap",
      scheduledFor: undefined,
      paymentMethod: "gcash_demo",
      items: [latte],
    });
    expect(sent).not.toHaveProperty("totalCentavos");
    expect(sent.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/orders/order-1");
    expect(JSON.parse(window.localStorage.getItem("hx_cart")!).items).toEqual(
      [],
    );
  });

  it("says 'Placing your order' for cash, and sends the chosen slot", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    storeCart([latte]);
    mocks.placeOrder.mockResolvedValue({ ok: true, orderId: "order-2" });
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /^Delivery/ }));
    fireEvent.change(screen.getByLabelText(/House or unit number/), {
      target: { value: "Unit 5, 26th St" },
    });
    fireEvent.change(screen.getByLabelText("Barangay"), {
      target: { value: "Wawa" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Schedule for later/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Cash on Delivery/ }));
    fireEvent.click(payButton());
    expect(screen.getByText("Placing your order…")).toBeVisible();
    expect(mocks.placeOrder.mock.calls[0]![0]).toMatchObject({
      timing: "scheduled",
      scheduledFor: slots[0],
      barangay: "Wawa",
      paymentMethod: "cod",
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
  });

  it("shows the server's answer when the order can't be placed, and reuses the request id", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    storeCart([latte]);
    mocks.placeOrder.mockResolvedValue({
      ok: false,
      message: "Some items in your cart cannot be ordered right now.",
      problems: [
        {
          itemId: "b",
          name: "Custom Latte",
          problem: "Whole milk is sold out.",
        },
      ],
    });
    renderForm();
    fireEvent.click(payButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /cannot be ordered right now/,
    );
    expect(
      screen.getByText("Custom Latte: Whole milk is sold out."),
    ).toBeInTheDocument();

    mocks.placeOrder.mockResolvedValue({
      ok: false,
      message: "Please choose another time.",
      errors: { timing: "This branch is not taking orders for right now." },
    });
    fireEvent.click(payButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
    expect(screen.getAllByText(/not taking orders for right now/).length).toBe(
      2,
    );
    const [first, second] = mocks.placeOrder.mock.calls;
    expect(first![0].clientRequestId).toBe(second![0].clientRequestId);
  });

  it("explains a lost connection", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    storeCart([latte]);
    mocks.placeOrder.mockRejectedValue(new Error("offline"));
    renderForm();
    fireEvent.click(payButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/could not reach/);
  });

  it("blocks paying for items sold out at the branch", () => {
    storeCart([latte]);
    renderForm(seedSnapshot([ingredientSoldOut("bgc", "whole")]));
    expect(payButton()).toBeDisabled();
    expect(screen.getAllByText(/sold out at BGC/).length).toBeGreaterThan(0);
  });

  it("makes a request id without crypto.randomUUID", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    storeCart([latte]);
    mocks.placeOrder.mockResolvedValue({ ok: true, orderId: "o" });
    renderForm();
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
    try {
      fireEvent.click(payButton());
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        value: original,
        configurable: true,
      });
    }
    expect(mocks.placeOrder.mock.calls[0]![0].clientRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROCESSING_MS);
    });
  });
});

describe("/checkout page", () => {
  it("renders the form for the signed-in user", async () => {
    expect(metadata).toEqual({ title: "Checkout" });
    render(<CheckoutPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeVisible();

    storeCart([latte]);
    render(await CheckoutContent());
    expect(mocks.requireUser).toHaveBeenCalledWith("/checkout");
    expect(await screen.findByLabelText("Mobile number")).toHaveValue(
      "0917 123 4567",
    );
    expect(screen.getByRole("radio", { name: /^BGC/ })).toBeChecked();
  });

  it("leaves the phone empty when the profile has none", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "u1",
      name: "Maria",
      email: "m@example.com",
      phone: null,
    });
    storeCart([latte]);
    render(await CheckoutContent());
    expect(await screen.findByLabelText("Mobile number")).toHaveValue("");
  });

  it("says so when the catalog can't be loaded", async () => {
    mocks.catalog = null;
    render(await CheckoutContent());
    expect(screen.getByRole("status")).toHaveTextContent(/unavailable/);
  });
});
