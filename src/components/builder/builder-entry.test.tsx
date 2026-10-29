import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toBuilderCatalog } from "@/lib/builder/catalog";
import { EMPTY_DRAFT } from "@/lib/builder/state";
import type { CartItem } from "@/lib/cart";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));
vi.mock("@/server/cart/actions", () => ({
  saveCart: vi.fn(async () => undefined),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

const { BuilderEntry } = await import("./builder-entry");

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);

const icedLatte: CartItem = {
  id: "drink-1",
  kind: "custom",
  config: {
    size: "16oz",
    temperature: "iced",
    iceLevel: "regular",
    base: "latte",
    shots: 1,
    milk: "oat",
    milkAmount: "regular",
    sweetness: 50,
    syrups: [],
    toppings: [],
  },
  quantity: 3,
};

function storeCart(items: CartItem[]) {
  window.localStorage.setItem(
    "hx_cart",
    JSON.stringify({ owner: null, items }),
  );
}

function renderEntry(
  editId: string | null,
  soldOutByBranch: Record<string, string[]> = {},
) {
  return render(
    <MotionConfig reducedMotion="always">
      <BuilderEntry
        editId={editId}
        catalog={catalog}
        start={EMPTY_DRAFT}
        signatureName={null}
        notice={null}
        initialBranch="tipas"
        soldOutByBranch={soldOutByBranch}
      />
    </MotionConfig>,
  );
}

const stepHeading = () => screen.getByRole("heading", { level: 2 }).textContent;

beforeEach(() => {
  routerPush.mockClear();
});

describe("BuilderEntry", () => {
  it("starts an empty cup when not editing", () => {
    renderEntry(null);
    expect(stepHeading()).toBe("Cup");
  });

  it("opens a cart drink on its review, and updates it in place", () => {
    storeCart([icedLatte]);
    renderEntry("drink-1");
    expect(stepHeading()).toBe("Review");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByTestId("live-price")).toHaveTextContent("₱540");

    fireEvent.click(screen.getByRole("button", { name: "Remove a cup" }));
    fireEvent.click(screen.getByRole("button", { name: "Update cart" }));

    const stored = JSON.parse(window.localStorage.getItem("hx_cart")!);
    expect(stored.items).toEqual([{ ...icedLatte, quantity: 2 }]);
    expect(routerPush).toHaveBeenCalledWith("/cart");
  });

  it("starts fresh when the drink is no longer in the cart", () => {
    storeCart([
      { id: "p", kind: "product", productSlug: "ensaymada", quantity: 1 },
    ]);
    renderEntry("p");
    expect(
      screen.getByText(/could not find that drink in your cart/),
    ).toBeVisible();
    expect(stepHeading()).toBe("Cup");
  });

  it("will not add a drink with an option sold out at the branch", () => {
    storeCart([icedLatte]);
    renderEntry("drink-1", { tipas: ["oat"] });
    expect(screen.getByRole("button", { name: "Update cart" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/sold out at Tipas/);
  });
});
