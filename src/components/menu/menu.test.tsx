import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogSnapshot, MenuItem, MenuSection } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  branch: "tipas",
  catalog: null as CatalogSnapshot | null,
}));

vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));
vi.mock("@/server/catalog/queries", () => ({
  getSelectedBranchSlug: async () => mocks.branch,
  loadCatalog: async () => mocks.catalog,
}));

const { BranchPicker } = await import("./branch-picker");
const { MenuContent } = await import("./menu-content");
const { MenuSections } = await import("./menu-sections");
const { ProductCard } = await import("./product-card");

const signature: MenuItem = {
  type: "signature",
  slug: "olympus-latte",
  name: "Olympus Latte",
  description: "Latte with oat milk, honey and a dusting of cinnamon.",
  priceCentavos: 17500,
  isSeasonal: false,
  isSoldOut: false,
};

const pastry: MenuItem = {
  type: "pastry",
  slug: "cinnamon-roll",
  name: "Cinnamon Roll",
  description: "Soft swirl of cinnamon sugar.",
  priceCentavos: 12000,
  isSeasonal: false,
  isSoldOut: false,
};

function renderCard(item: MenuItem) {
  render(
    <ul>
      <ProductCard item={item} />
    </ul>,
  );
  return screen.getByTestId(`product-${item.slug}`);
}

describe("ProductCard", () => {
  it("shows the name, peso price and description", () => {
    const card = renderCard(signature);
    expect(
      within(card).getByRole("heading", { level: 3, name: "Olympus Latte" }),
    ).toBeInTheDocument();
    expect(within(card).getByText("₱175")).toBeInTheDocument();
    expect(within(card).getByText(signature.description)).toBeInTheDocument();
    expect(within(card).queryByRole("list", { name: "Status" })).toBeNull();
  });

  it("lets signature drinks open in the builder, with add to cart coming soon", () => {
    const card = renderCard(signature);
    expect(
      within(card).getByRole("link", { name: "Customize Olympus Latte" }),
    ).toHaveAttribute("href", "/build?drink=olympus-latte");
    expect(
      within(card).getByRole("button", { name: "Add Olympus Latte to cart" }),
    ).toBeDisabled();
  });

  it("does not offer Customize for pastries and snacks", () => {
    const card = renderCard(pastry);
    expect(within(card).queryByText("Customize")).toBeNull();
    expect(
      within(card).getByRole("button", { name: "Add Cinnamon Roll to cart" }),
    ).toBeDisabled();
  });

  it("labels sold-out items and disables their actions", () => {
    const card = renderCard({ ...signature, isSoldOut: true });
    expect(
      within(card).getByText("Sold out at this branch"),
    ).toBeInTheDocument();
    expect(within(card).queryByRole("link")).toBeNull();
    expect(
      within(card).getByRole("button", { name: "Customize Olympus Latte" }),
    ).toBeDisabled();
  });

  it("labels seasonal items", () => {
    const card = renderCard({ ...pastry, isSeasonal: true });
    const status = within(card).getByRole("list", { name: "Status" });
    expect(within(status).getByText("Seasonal")).toBeInTheDocument();
    expect(within(status).queryByText("Sold out at this branch")).toBeNull();
  });
});

describe("BranchPicker", () => {
  it("offers every branch and marks the selected one", () => {
    render(<BranchPicker selected="bgc" />);
    expect(
      screen.getByRole("group", { name: "Showing availability at" }),
    ).toBeInTheDocument();
    const bgc = screen.getByRole("button", { name: "BGC" });
    expect(bgc).toHaveAttribute("aria-pressed", "true");
    expect(bgc).toHaveAttribute("name", "branch");
    expect(bgc).toHaveAttribute("value", "bgc");
    expect(screen.getByRole("button", { name: "Tipas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Taguig Lakeshore" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

describe("MenuSections", () => {
  const sections: MenuSection[] = [
    { type: "signature", items: [signature] },
    { type: "pastry", items: [pastry] },
    { type: "snack", items: [] },
  ];

  it("links to each section and labels each section by its heading", () => {
    render(<MenuSections sections={sections} />);
    const nav = screen.getByRole("navigation", { name: "Menu sections" });
    expect(
      within(nav).getByRole("link", { name: "Signature Drinks" }),
    ).toHaveAttribute("href", "#signature-drinks");
    expect(within(nav).getByRole("link", { name: "Pastries" })).toHaveAttribute(
      "href",
      "#pastries",
    );
    expect(within(nav).getByRole("link", { name: "Snacks" })).toHaveAttribute(
      "href",
      "#snacks",
    );
    for (const name of ["Signature Drinks", "Pastries", "Snacks"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("puts each item in its own section", () => {
    render(<MenuSections sections={sections} />);
    const pastries = screen.getByRole("region", { name: "Pastries" });
    expect(within(pastries).getByText("Cinnamon Roll")).toBeInTheDocument();
    expect(within(pastries).queryByText("Olympus Latte")).toBeNull();
  });

  it("explains an empty section", () => {
    render(<MenuSections sections={sections} />);
    expect(
      within(screen.getByRole("region", { name: "Snacks" })).getByText(
        /Nothing here at the moment/,
      ),
    ).toBeInTheDocument();
  });
});

describe("MenuContent", () => {
  const snapshot: CatalogSnapshot = {
    ingredients: [],
    products: [
      {
        id: "p-roll",
        type: "pastry",
        slug: "cinnamon-roll",
        name: "Cinnamon Roll",
        description: "Soft swirl of cinnamon sugar.",
        priceCentavos: 12000,
        imageUrl: null,
        recipe: null,
        isSeasonal: false,
        availableFrom: null,
        availableTo: null,
        sortOrder: 10,
        isActive: true,
      },
    ],
    soldOut: [{ branchSlug: "bgc", ingredientId: null, productId: "p-roll" }],
  };

  beforeEach(() => {
    mocks.branch = "tipas";
    mocks.catalog = snapshot;
  });

  it("shows the menu for the selected branch", async () => {
    render(await MenuContent());
    expect(screen.getByRole("button", { name: "Tipas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Cinnamon Roll")).toBeInTheDocument();
    expect(screen.queryByText("Sold out at this branch")).toBeNull();
    expect(screen.getByText(/Online ordering opens soon/)).toBeInTheDocument();
  });

  it("shows sold-out items at the branch that flagged them", async () => {
    mocks.branch = "bgc";
    render(await MenuContent());
    expect(screen.getByText("Sold out at this branch")).toBeInTheDocument();
  });

  it("shows a polite message when the catalog can't be loaded", async () => {
    mocks.catalog = null;
    render(await MenuContent());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Our menu is unavailable at the moment.",
    );
    expect(screen.queryByRole("region")).toBeNull();
  });
});
