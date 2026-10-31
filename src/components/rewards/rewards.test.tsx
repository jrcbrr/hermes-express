import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markBadgesSeen: vi.fn(),
  rateItem: vi.fn(),
  removeFavorite: vi.fn(),
  add: vi.fn(),
}));

vi.mock("@/server/rewards/actions", () => ({
  markBadgesSeen: mocks.markBadgesSeen,
}));
vi.mock("@/server/ratings/actions", () => ({ rateItem: mocks.rateItem }));
vi.mock("@/server/favorites/actions", () => ({
  removeFavorite: mocks.removeFavorite,
}));
vi.mock("@/components/cart/cart-store", () => ({
  cartStore: { add: mocks.add },
}));

const { BadgeList } = await import("./badge-list");
const { BadgeToast } = await import("./badge-toast");
const { RewardField } = await import("@/components/checkout/reward-field");
const { RatingForm } = await import("@/components/ratings/rating-form");
const { RemoveFavoriteButton } =
  await import("@/components/favorites/remove-favorite-button");
const { ReorderButton } = await import("@/components/orders/reorder-button");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.markBadgesSeen.mockResolvedValue(undefined);
});

describe("BadgeList", () => {
  it("shows every badge and says which are earned", () => {
    render(<BadgeList earned={["first_sip"]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByText(/First Sip/)).toHaveTextContent("(earned)");
    expect(screen.getByText(/Regular/)).toHaveTextContent("(not yet earned)");
  });
});

describe("BadgeToast", () => {
  it("announces the badge and marks it seen once", async () => {
    await act(async () => {
      render(<BadgeToast keys={["first_sip"]} names={["First Sip"]} />);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Badge earned: First Sip.",
    );
    expect(mocks.markBadgesSeen).toHaveBeenCalledExactlyOnceWith(["first_sip"]);
  });

  it("survives failing to mark it seen", async () => {
    mocks.markBadgesSeen.mockRejectedValue(new Error("offline"));
    await act(async () => {
      render(<BadgeToast keys={["first_sip"]} names={["First Sip"]} />);
    });
    expect(screen.getByRole("status")).toHaveTextContent("First Sip");
  });
});

describe("RewardField", () => {
  const option = {
    itemId: "a",
    name: "Olympus Latte",
    points: 150,
    valueCentavos: 17500,
  };

  it("offers drinks the balance can pay for", () => {
    const onChange = vi.fn();
    render(
      <RewardField
        options={[option, { ...option, itemId: "b", points: 350 }]}
        balance={200}
        value=""
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText("Use your points (200 available)");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: /150 points for ₱175 off/ }),
    ).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "a" } });
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("says how many points are needed", () => {
    render(
      <RewardField
        options={[option]}
        balance={10}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/start at 150 points/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("asks for a drink when none qualifies", () => {
    render(
      <RewardField options={[]} balance={500} value="" onChange={vi.fn()} />,
    );
    expect(screen.getByText(/Add a drink/)).toBeInTheDocument();
  });
});

describe("RatingForm", () => {
  const submit = () =>
    screen.getByRole("button", { name: "Submit rating for Latte" });

  it("needs stars before it can be sent", () => {
    render(<RatingForm orderItemId="i1" name="Latte" />);
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "1 star" }));
    expect(submit()).toBeEnabled();
  });

  it("sends the stars and comment", async () => {
    mocks.rateItem.mockResolvedValue({ ok: true });
    render(<RatingForm orderItemId="i1" name="Latte" />);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    fireEvent.change(screen.getByLabelText("Comment (optional)"), {
      target: { value: "Lovely" },
    });
    fireEvent.click(submit());
    await waitFor(() =>
      expect(mocks.rateItem).toHaveBeenCalledWith({
        orderItemId: "i1",
        stars: 4,
        comment: "Lovely",
      }),
    );
  });

  it("shows why it failed", async () => {
    mocks.rateItem.mockResolvedValue({ ok: false, message: "Already rated" });
    render(<RatingForm orderItemId="i1" name="Latte" />);
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("Already rated");
  });

  it("explains a failed connection", async () => {
    mocks.rateItem.mockRejectedValue(new Error("offline"));
    render(<RatingForm orderItemId="i1" name="Latte" />);
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(/try again/);
  });
});

describe("ReorderButton", () => {
  const entry = {
    kind: "product" as const,
    productSlug: "banana-bread",
    quantity: 1,
  };

  it("adds everything to the cart", () => {
    mocks.add.mockReturnValue(true);
    render(
      <ReorderButton
        entries={[entry, entry]}
        unavailable={["Old Drink"]}
        label="Reorder"
        ariaLabel="Reorder HX-AAAA"
      />,
    );
    expect(screen.getByText(/No longer available: Old Drink/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reorder HX-AAAA" }));
    expect(mocks.add).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent(/current prices/);
  });

  it("says when the cart is full", () => {
    mocks.add.mockReturnValue(false);
    render(<ReorderButton entries={[entry]} label="Reorder" ariaLabel="R" />);
    fireEvent.click(screen.getByRole("button", { name: "R" }));
    expect(screen.getByRole("status")).toHaveTextContent(/cart is full/);
  });

  it("is disabled with nothing to add", () => {
    render(<ReorderButton entries={[]} label="Reorder" ariaLabel="R" />);
    expect(screen.getByRole("button", { name: "R" })).toBeDisabled();
  });
});

describe("RemoveFavoriteButton", () => {
  it("removes, and shows why it failed", async () => {
    mocks.removeFavorite.mockResolvedValue({ ok: false, message: "Nope" });
    render(<RemoveFavoriteButton id="f1" name="Monday Fuel" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Monday Fuel from favorites" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
    expect(mocks.removeFavorite).toHaveBeenCalledWith("f1");
  });
});
