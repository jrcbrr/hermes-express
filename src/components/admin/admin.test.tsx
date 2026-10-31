import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/menu",
  updateOrderStatus: vi.fn(),
  setProductActive: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/server/admin/order-actions", () => ({
  updateOrderStatus: mocks.updateOrderStatus,
}));
vi.mock("@/server/admin/menu-actions", () => ({
  createProduct: vi.fn(async () => ({})),
  updateProduct: vi.fn(async () => ({})),
  setProductActive: mocks.setProductActive,
}));
vi.mock("@/server/admin/customer-actions", () => ({
  updateCustomer: vi.fn(async () => ({})),
  setUserRole: vi.fn(async () => ({})),
  adjustPoints: vi.fn(async () => ({})),
}));

const { AdminNav } = await import("./admin-nav");
const { Pager } = await import("./admin-ui");
const { OrderStatusSelect } = await import("./order-status-select");
const { ProductActiveToggle } = await import("./product-active-toggle");
const { ProductForm } = await import("./product-form");
const { RoleForm } = await import("./customer-forms");

const options = {
  sizes: [{ slug: "12oz", name: "12oz" }],
  temperatures: [{ slug: "hot", name: "Hot" }],
  bases: [{ slug: "latte", name: "Latte" }],
  milks: [{ slug: "none", name: "None" }],
  syrups: [{ slug: "vanilla", name: "Vanilla" }],
  toppings: [],
};
const values = {
  type: "pastry" as const,
  name: "",
  description: "",
  price: "",
  isSeasonal: false,
  availableFrom: "",
  availableTo: "",
  isActive: true,
  recipeSize: "12oz",
  recipeTemperature: "hot",
  recipeBase: "",
  recipeMilk: "none",
  recipeSweetness: "0",
  recipeSyrups: [],
  recipeToppings: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/admin/menu";
  // jsdom doesn't implement <dialog> methods.
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("AdminNav", () => {
  it("marks the current section, including its sub-pages", () => {
    mocks.pathname = "/admin/menu/new";
    render(<AdminNav />);
    const current = screen
      .getAllByRole("link", { hidden: true })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current[0]).toHaveTextContent("Menu");
  });

  it("marks Overview only on /admin itself", () => {
    mocks.pathname = "/admin";
    render(<AdminNav />);
    const current = screen
      .getAllByRole("link", { hidden: true })
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current[0]).toHaveTextContent("Overview");
  });

  it("opens the drawer and closes it from its button and links", () => {
    render(<AdminNav />);
    fireEvent.click(screen.getByRole("button", { name: "Admin menu" }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Close admin menu", hidden: true }),
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);

    const orders = screen
      .getAllByRole("link", { name: "Orders", hidden: true })
      .at(-1)!;
    fireEvent.click(orders);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(2);
  });

  it("closes on a backdrop click, but not on a click inside", () => {
    const { container } = render(<AdminNav />);
    fireEvent.click(container.querySelector("dialog")!);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByText("Admin").at(-1)!);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });
});

describe("Pager", () => {
  it("keeps filters and hides when there is one page", () => {
    const { rerender, container } = render(
      <Pager
        path="/admin/orders"
        params={{ status: "brewing", branch: null }}
        page={2}
        hasMore
      />,
    );
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
      "href",
      "/admin/orders?status=brewing",
    );
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/admin/orders?status=brewing&page=3",
    );

    rerender(
      <Pager path="/admin/orders" params={{}} page={1} hasMore={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("OrderStatusSelect", () => {
  const props = {
    orderId: "o1",
    code: "HX-AAAA",
    fulfillment: "pickup" as const,
  };

  it("offers only allowed moves", () => {
    render(<OrderStatusSelect {...props} status="brewing" />);
    const labels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual(["Brewing", "Ready for pickup", "Cancelled"]);
  });

  it("shows plain text for a final order", () => {
    render(<OrderStatusSelect {...props} status="completed" />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("saves a change and refreshes", async () => {
    mocks.updateOrderStatus.mockResolvedValue({ ok: true });
    render(<OrderStatusSelect {...props} status="received" />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "brewing" },
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith({
      orderId: "o1",
      to: "brewing",
    });
  });

  it("shows why a change failed", async () => {
    mocks.updateOrderStatus.mockResolvedValue({ ok: false, message: "Nope" });
    render(<OrderStatusSelect {...props} status="received" />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "brewing" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("ProductActiveToggle", () => {
  it("names the item and hides it", async () => {
    mocks.setProductActive.mockResolvedValue({ ok: true });
    render(<ProductActiveToggle id="p1" name="Latte" isActive />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Latte" }));
    await waitFor(() =>
      expect(mocks.setProductActive).toHaveBeenCalledWith({
        id: "p1",
        active: false,
      }),
    );
  });

  it("shows why it failed", async () => {
    mocks.setProductActive.mockResolvedValue({ ok: false, message: "Nope" });
    render(<ProductActiveToggle id="p1" name="Latte" isActive={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Latte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
  });
});

describe("ProductForm", () => {
  it("shows the recipe only for a signature drink", () => {
    render(<ProductForm initial={values} recipeOptions={options} />);
    expect(screen.queryByLabelText("Base")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "signature" },
    });
    expect(screen.getByLabelText("Base")).toBeInTheDocument();
    expect(screen.getByLabelText("Vanilla")).toBeInTheDocument();
  });

  it("shows dates only for a seasonal item", () => {
    render(<ProductForm initial={values} recipeOptions={options} />);
    expect(screen.queryByLabelText("First day available")).toBeNull();
    fireEvent.click(screen.getByLabelText("Seasonal item"));
    expect(screen.getByLabelText("First day available")).toBeInTheDocument();
  });

  it("fixes the type once created", () => {
    render(
      <ProductForm
        initial={{ ...values, id: "p1", name: "Muffin" }}
        recipeOptions={options}
      />,
    );
    expect(screen.queryByLabelText("Type")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
});

describe("RoleForm", () => {
  const props = {
    userId: "u1",
    branches: [{ id: "b1", name: "BGC" }],
    isSelf: false,
  };

  it("asks for a branch only for a barista", () => {
    render(
      <RoleForm {...props} initial={{ role: "customer", branchId: "" }} />,
    );
    expect(screen.queryByLabelText("Branch")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "barista" },
    });
    expect(screen.getByLabelText("Branch")).toBeInTheDocument();
  });

  it("offers no form for your own role", () => {
    render(
      <RoleForm {...props} isSelf initial={{ role: "admin", branchId: "" }} />,
    );
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
    expect(screen.getByText(/cannot change your own role/)).toBeInTheDocument();
  });
});
