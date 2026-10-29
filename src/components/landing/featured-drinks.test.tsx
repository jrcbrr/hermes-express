import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct, CatalogSnapshot } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({
  catalog: null as CatalogSnapshot | null,
  connection: vi.fn(async () => {}),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/server/catalog/queries", () => ({
  loadCatalog: async () => mocks.catalog,
}));

const { FeaturedDrinkList } = await import("./featured-drink-list");

function signature(
  slug: string,
  name: string,
  priceCentavos: number,
  extra: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id: slug,
    type: "signature",
    slug,
    name,
    description: `${name} description`,
    priceCentavos,
    imageUrl: null,
    recipe: null,
    isSeasonal: false,
    availableFrom: null,
    availableTo: null,
    sortOrder: 0,
    isActive: true,
    ...extra,
  };
}

const products: CatalogProduct[] = [
  signature("olympus-latte", "Olympus Latte", 17500, {
    sortOrder: 10,
    imageUrl: "/images/menu/olympus-latte.jpg",
  }),
  signature("winged-mocha", "Winged Mocha", 18500, { sortOrder: 20 }),
  signature("caduceus-cold-brew", "Caduceus Cold Brew", 17500, {
    sortOrder: 30,
  }),
  signature("retired", "Retired Drink", 10000, { isActive: false }),
  { ...signature("croissant", "Butter Croissant", 9500), type: "pastry" },
];

beforeEach(() => {
  mocks.catalog = { ingredients: [], products, soldOut: [] };
});

describe("FeaturedDrinkList", () => {
  it("reads the database per request, not at build time", async () => {
    await FeaturedDrinkList();
    expect(mocks.connection).toHaveBeenCalled();
  });

  it("shows the active signature drinks in menu order with peso prices", async () => {
    render(await FeaturedDrinkList());
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Olympus Latte", "Winged Mocha", "Caduceus Cold Brew"]);
    expect(screen.getAllByText("₱175")).toHaveLength(2);
    expect(screen.getByText("₱185")).toBeInTheDocument();
    expect(screen.queryByText("Butter Croissant")).toBeNull();
  });

  it("links each drink to the menu and to the builder, prefilled", async () => {
    render(await FeaturedDrinkList());
    const card = screen
      .getByRole("heading", { name: "Winged Mocha" })
      .closest("li")!;
    expect(
      within(card).getByRole("link", { name: "Add Winged Mocha" }),
    ).toHaveAttribute("href", "/menu#signature-drinks");
    expect(
      within(card).getByRole("link", { name: "Customize Winged Mocha" }),
    ).toHaveAttribute("href", "/build?drink=winged-mocha");
  });

  it("shows each drink's photo when it has one", async () => {
    render(await FeaturedDrinkList());
    const card = (name: string) =>
      screen.getByRole("heading", { name }).closest("li")!;
    expect(
      decodeURIComponent(
        card("Olympus Latte").querySelector("img")!.getAttribute("src")!,
      ),
    ).toContain("/images/menu/olympus-latte.jpg");
    expect(card("Winged Mocha").querySelector("img")).toBeNull();
  });

  it("shows at most 6 drinks", async () => {
    mocks.catalog = {
      ingredients: [],
      products: Array.from({ length: 8 }, (_, n) =>
        signature(`drink-${n}`, `Drink ${n}`, 15000, { sortOrder: n }),
      ),
      soldOut: [],
    };
    render(await FeaturedDrinkList());
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("shows a polite message when the catalog can't be loaded", async () => {
    mocks.catalog = null;
    render(await FeaturedDrinkList());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Our signature drinks are unavailable at the moment.",
    );
  });
});
