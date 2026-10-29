import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogSnapshot } from "@/lib/catalog";
import { ingredientSoldOut, seedSnapshot } from "@/test/catalog-fixture";

const mocks = vi.hoisted(() => ({
  branch: "tipas",
  catalog: null as CatalogSnapshot | null,
}));

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));
vi.mock("@/server/cart/actions", () => ({
  saveCart: vi.fn(async () => undefined),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("@/server/catalog/queries", () => ({
  getSelectedBranchSlug: async () => mocks.branch,
  loadCatalog: async () => mocks.catalog,
}));

const { BuilderContent } = await import("./builder-content");
const { default: BuildPage, metadata } =
  await import("@/app/(public)/build/page");

async function renderContent(params: Record<string, string> = {}) {
  const ui = await BuilderContent({ searchParams: Promise.resolve(params) });
  return render(<MotionConfig reducedMotion="always">{ui}</MotionConfig>);
}

beforeEach(() => {
  mocks.branch = "tipas";
  mocks.catalog = seedSnapshot();
});

describe("BuilderContent", () => {
  it("shows a polite message when the catalog can't be loaded", async () => {
    mocks.catalog = null;
    await renderContent();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The drink builder is unavailable at the moment.",
    );
    expect(
      screen.getByRole("link", { name: "browse the menu" }),
    ).toHaveAttribute("href", "/menu");
  });

  it("starts from a signature drink with ?from=", async () => {
    await renderContent({ from: "winged-mocha" });
    expect(screen.getByText("Winged Mocha")).toBeVisible();
    expect(screen.getByTestId("live-price")).toHaveTextContent("₱185");
  });

  it("explains an unknown drink link", async () => {
    await renderContent({ from: "nectar" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "We could not find that drink",
    );
  });

  it("uses the remembered branch and its sold-out options", async () => {
    mocks.branch = "bgc";
    mocks.catalog = seedSnapshot([ingredientSoldOut("bgc", "16oz")]);
    await renderContent();
    expect(screen.getByRole("button", { name: "BGC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("radio", { name: /16oz/ })).toBeDisabled();
  });
});

describe("/build page", () => {
  it("has a title and a heading", () => {
    expect(metadata.title).toBe("Build Your Drink");
    render(
      <BuildPage
        searchParams={Promise.resolve({})}
        params={Promise.resolve({})}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Build your drink" }),
    ).toBeVisible();
  });
});
