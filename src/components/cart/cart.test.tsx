import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/cart";
import type { CatalogSnapshot } from "@/lib/catalog";
import {
  FIXTURE_NOW,
  ingredientSoldOut,
  seedSnapshot,
} from "@/test/catalog-fixture";

const mocks = vi.hoisted(() => ({
  saveCart: vi.fn(async (items: unknown) => void items),
  syncCart: vi.fn(),
  getSession: vi.fn(),
  branch: "tipas",
  catalog: null as CatalogSnapshot | null,
}));

vi.mock("@/server/cart/actions", () => ({
  saveCart: mocks.saveCart,
  syncCart: mocks.syncCart,
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));
vi.mock("@/server/catalog/queries", () => ({
  getSelectedBranchSlug: async () => mocks.branch,
  loadCatalog: async () => mocks.catalog,
}));
vi.mock("next/server", () => ({ connection: async () => {} }));

const { cartStore, newCartItemId, useCart, CART_STORAGE_KEY } =
  await import("./cart-store");
const { CartAccountSync } = await import("./cart-account-sync");
const { CartSessionSlot } = await import("./cart-session-slot");
const { CartHeaderLink, cartLabel } = await import("./cart-count");
const { CartView } = await import("./cart-view");
const { CartContent } = await import("./cart-content");
const { default: CartPage, metadata } =
  await import("@/app/(customer)/cart/page");

const croissant: CartItem = {
  id: "a",
  kind: "product",
  productSlug: "butter-croissant",
  quantity: 1,
};
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

function storeCart(items: CartItem[], owner: string | null = null) {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({ owner, items }),
  );
}
const stored = () =>
  JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");

beforeEach(() => {
  vi.useRealTimers();
  mocks.saveCart.mockClear();
  mocks.syncCart.mockReset();
  mocks.branch = "tipas";
  mocks.catalog = seedSnapshot();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cartStore", () => {
  it("adds, changes and removes items in localStorage", () => {
    expect(cartStore.add({ ...croissant, quantity: 1 })).toBe(true);
    const [item] = stored().items;
    expect(item).toMatchObject({ kind: "product", quantity: 1 });

    cartStore.setQuantity(item.id, 4);
    expect(stored().items[0].quantity).toBe(4);
    cartStore.replace(item.id, { ...croissant, productSlug: "ensaymada" });
    expect(stored().items[0]).toMatchObject({
      id: item.id,
      productSlug: "ensaymada",
      quantity: 1,
    });
    cartStore.remove(item.id);
    expect(stored().items).toEqual([]);
  });

  it("refuses to add to a full cart", () => {
    storeCart(
      Array.from({ length: 30 }, (_, i) => ({
        ...croissant,
        id: `i${i}`,
        productSlug: `item-${i}`,
      })),
    );
    expect(cartStore.add({ ...croissant, productSlug: "another" })).toBe(false);
  });

  it("saves an account's cart to the server shortly after a change", () => {
    vi.useFakeTimers();
    storeCart([croissant], "u1");
    cartStore.setQuantity("a", 2);
    cartStore.setQuantity("a", 3);
    expect(mocks.saveCart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(mocks.saveCart).toHaveBeenCalledTimes(1);
    expect(mocks.saveCart).toHaveBeenCalledWith([
      { ...croissant, quantity: 3 },
    ]);
  });

  it("never sends a guest's cart to the server", () => {
    vi.useFakeTimers();
    cartStore.add(croissant);
    vi.advanceTimersByTime(500);
    expect(mocks.saveCart).not.toHaveBeenCalled();
  });

  it("clears, forgets and takes an account cart without saving it back", () => {
    vi.useFakeTimers();
    storeCart([croissant], "u1");
    cartStore.setAccount("u2", [latte]);
    expect(stored()).toEqual({ owner: "u2", items: [latte] });
    cartStore.clear();
    expect(stored()).toEqual({ owner: "u2", items: [] });
    cartStore.forget();
    expect(stored()).toEqual({ owner: null, items: [] });
    vi.advanceTimersByTime(500);
    expect(mocks.saveCart).toHaveBeenCalledTimes(1);
    expect(mocks.saveCart).toHaveBeenCalledWith([]);
  });

  it("reads a broken stored value as an empty cart", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    expect(cartStore.read().cart.items).toEqual([]);
  });

  it("makes unique ids", () => {
    expect(newCartItemId()).not.toBe(newCartItemId());
    // Plain-http pages have no randomUUID.
    vi.stubGlobal("crypto", {});
    try {
      expect(newCartItemId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("follows changes made in another tab", () => {
    function Count() {
      const { cart } = useCart();
      return <p>{cart.items.length} items</p>;
    }
    render(<Count />);
    expect(screen.getByText("0 items")).toBeInTheDocument();
    act(() => {
      storeCart([croissant, latte]);
      window.dispatchEvent(
        new StorageEvent("storage", { key: CART_STORAGE_KEY }),
      );
    });
    expect(screen.getByText("2 items")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    });
    expect(screen.getByText("2 items")).toBeInTheDocument();
  });
});

describe("CartAccountSync", () => {
  it("merges a guest cart into the account on login", async () => {
    storeCart([croissant]);
    mocks.syncCart.mockResolvedValue({
      userId: "u1",
      items: [croissant, latte],
    });
    render(<CartAccountSync userId="u1" />);
    expect(mocks.syncCart).toHaveBeenCalledWith([croissant]);
    await waitFor(() =>
      expect(stored()).toEqual({ owner: "u1", items: [croissant, latte] }),
    );
  });

  it("loads the account cart without sharing another account's", async () => {
    storeCart([croissant], "someone-else");
    mocks.syncCart.mockResolvedValue({ userId: "u1", items: [latte] });
    render(<CartAccountSync userId="u1" />);
    expect(mocks.syncCart).toHaveBeenCalledWith([]);
    await waitFor(() => expect(stored().owner).toBe("u1"));
    expect(stored().items).toEqual([latte]);
  });

  it("ignores an answer for another user, or a failure", async () => {
    storeCart([croissant]);
    mocks.syncCart.mockResolvedValueOnce({ userId: null, items: [] });
    const { unmount } = render(<CartAccountSync userId="u1" />);
    await waitFor(() => expect(mocks.syncCart).toHaveBeenCalled());
    unmount();
    mocks.syncCart.mockRejectedValueOnce(new Error("offline"));
    render(<CartAccountSync userId="u1" />);
    await waitFor(() => expect(mocks.syncCart).toHaveBeenCalledTimes(2));
    expect(stored()).toEqual({ owner: null, items: [croissant] });
  });

  /** A syncCart call that stays open until the test answers it. */
  function pendingSync() {
    let answer: (value: unknown) => void = () => {};
    mocks.syncCart.mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve)),
    );
    return (value: unknown) => act(async () => answer(value));
  }

  it("keeps an item added while the saved cart is loading", async () => {
    storeCart([], "u1");
    const answer = pendingSync();
    render(<CartAccountSync userId="u1" />);
    cartStore.add(croissant);
    await answer({ userId: "u1", items: [] });
    expect(stored().items).toEqual([
      expect.objectContaining({ productSlug: croissant.productSlug }),
    ]);
  });

  it("keeps a guest's item added while the login merge is running", async () => {
    storeCart([croissant]);
    const answer = pendingSync();
    render(<CartAccountSync userId="u1" />);
    cartStore.add({ ...latte, quantity: 1 });
    await answer({ userId: "u1", items: [croissant] });
    expect(stored().owner).toBe("u1");
    expect(stored().items).toHaveLength(2);
    expect(stored().items[0]).toEqual(croissant);
    expect(stored().items[1]).toMatchObject({ kind: latte.kind });
  });

  it("sends that guest item to the account as well", async () => {
    vi.useFakeTimers();
    storeCart([croissant]);
    const answer = pendingSync();
    render(<CartAccountSync userId="u1" />);
    cartStore.add({ ...latte, quantity: 1 });
    await answer({ userId: "u1", items: [croissant] });
    vi.advanceTimersByTime(500);
    expect(mocks.saveCart).toHaveBeenCalledWith(stored().items);
  });

  it("keeps a change whose save was cut off by leaving the page", async () => {
    vi.useFakeTimers();
    storeCart([], "u1");
    cartStore.add(croissant);
    const added = stored().items;
    // The delayed save never ran; a new page now opens.
    vi.clearAllTimers();
    mocks.syncCart.mockResolvedValue({ userId: "u1", items: [] });
    render(<CartAccountSync userId="u1" />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(stored().items).toEqual(added);
    expect(mocks.saveCart).toHaveBeenCalledWith(added);
    expect(mocks.syncCart).not.toHaveBeenCalled();
  });

  it("loads the saved cart again once a change has been saved", async () => {
    vi.useFakeTimers();
    storeCart([], "u1");
    cartStore.add(croissant);
    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.saveCart).toHaveBeenCalledTimes(1);
    mocks.syncCart.mockResolvedValue({ userId: "u1", items: [latte] });
    render(<CartAccountSync userId="u1" />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(stored().items).toEqual([latte]);
  });

  it("does not treat a failed save as saved", async () => {
    vi.useFakeTimers();
    mocks.saveCart.mockRejectedValueOnce(new Error("offline"));
    storeCart([], "u1");
    cartStore.add(croissant);
    await vi.advanceTimersByTimeAsync(500);
    render(<CartAccountSync userId="u1" />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(mocks.syncCart).not.toHaveBeenCalled();
    expect(mocks.saveCart).toHaveBeenCalledTimes(2);
  });

  it("never pushes one account's unsaved cart into another account", async () => {
    vi.useFakeTimers();
    storeCart([], "someone-else");
    cartStore.add(croissant);
    vi.clearAllTimers();
    mocks.syncCart.mockResolvedValue({ userId: "u1", items: [latte] });
    render(<CartAccountSync userId="u1" />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(mocks.syncCart).toHaveBeenCalledWith([]);
    expect(mocks.saveCart).not.toHaveBeenCalled();
    expect(stored()).toEqual({ owner: "u1", items: [latte] });
  });

  it("forgets an account's cart after logging out, but keeps a guest's", () => {
    storeCart([croissant], "u1");
    const { rerender } = render(<CartAccountSync userId={null} />);
    expect(stored()).toEqual({ owner: null, items: [] });
    storeCart([latte]);
    rerender(<CartAccountSync userId={null} key="again" />);
    expect(stored().items).toEqual([latte]);
    expect(mocks.syncCart).not.toHaveBeenCalled();
  });

  it("gets the user from the session on the server", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u9" } });
    expect((await CartSessionSlot()).props).toEqual({ userId: "u9" });
    mocks.getSession.mockResolvedValueOnce(null);
    expect((await CartSessionSlot()).props).toEqual({ userId: null });
  });
});

describe("CartHeaderLink", () => {
  it("shows the number of items", () => {
    expect(cartLabel(1)).toBe("Cart, 1 item");
    storeCart([croissant, latte]);
    render(<CartHeaderLink />);
    expect(screen.getByRole("link", { name: "Cart, 3 items" })).toHaveAttribute(
      "href",
      "/cart",
    );
    expect(screen.getByTestId("cart-count")).toHaveTextContent("3");
  });

  it("shows no bubble when the cart is empty, and caps big numbers", () => {
    const { unmount } = render(<CartHeaderLink />);
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
    expect(screen.queryByTestId("cart-count")).toBeNull();
    unmount();
    storeCart(
      Array.from({ length: 6 }, (_, i) => ({
        ...croissant,
        id: `i${i}`,
        productSlug: `p${i}`,
        quantity: 20,
      })),
    );
    render(<CartHeaderLink />);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("99+");
  });
});

describe("CartView", () => {
  function renderView(snapshot = seedSnapshot()) {
    return render(
      <CartView snapshot={snapshot} initialBranch="tipas" now={FIXTURE_NOW} />,
    );
  }

  it("invites the customer to the menu when empty", () => {
    renderView();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });

  it("lists items with prices, and totals them", () => {
    storeCart([croissant, latte]);
    renderView();
    const [first, second] = screen.getAllByTestId("cart-item");
    expect(within(first!).getByText("Butter Croissant")).toBeInTheDocument();
    expect(within(first!).getByText("₱95")).toBeInTheDocument();
    expect(within(first!).queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(within(second!).getByText("Custom Latte")).toBeInTheDocument();
    expect(
      within(second!).getByText(/12oz · Hot · Latte · 1 shot/),
    ).toBeInTheDocument();
    expect(within(second!).getByText("₱260")).toBeInTheDocument();
    expect(
      within(second!).getByRole("link", { name: "Edit Custom Latte" }),
    ).toHaveAttribute("href", "/build?edit=b");
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("₱355");
    expect(screen.getByText(/₱445 to go/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Proceed to checkout" }),
    ).toHaveAttribute("href", "/checkout");
  });

  it("changes quantities and removes items", () => {
    storeCart([croissant, latte]);
    renderView();
    const [first] = screen.getAllByTestId("cart-item");
    fireEvent.click(
      within(first!).getByRole("button", { name: "Add a piece" }),
    );
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("₱450");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Butter Croissant" }),
    );
    expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    expect(stored().items).toEqual([latte]);
  });

  it("says when delivery would be free", () => {
    storeCart([{ ...latte, quantity: 7 }]);
    renderView();
    expect(screen.getByText(/Your order qualifies/)).toBeInTheDocument();
  });

  it("blocks checkout for items sold out at the branch, until the branch changes", () => {
    storeCart([latte, { ...croissant, productSlug: "gone" }]);
    renderView(seedSnapshot([ingredientSoldOut("tipas", "whole")]));
    expect(
      screen.getByText("Whole milk is sold out at Tipas."),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Proceed to checkout" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Item no longer on the menu" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "BGC" }));
    expect(document.cookie).toContain("hx_menu_branch=bgc");
    expect(
      screen.getByRole("link", { name: "Proceed to checkout" }),
    ).toBeInTheDocument();
  });
});

describe("/cart page", () => {
  it("renders the cart with the catalog", async () => {
    expect(metadata).toEqual({ title: "Cart" });
    render(<CartPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your cart" }),
    ).toBeInTheDocument();
    render(await CartContent());
    expect(await screen.findByText("Your cart is empty.")).toBeInTheDocument();
  });

  it("says so when the catalog can't be loaded", async () => {
    mocks.catalog = null;
    render(await CartContent());
    expect(screen.getByRole("status")).toHaveTextContent(/unavailable/);
  });
});
