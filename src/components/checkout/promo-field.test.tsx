import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/cart";

const mocks = vi.hoisted(() => ({ previewPromo: vi.fn() }));
vi.mock("@/server/promos/actions", () => ({
  previewPromo: mocks.previewPromo,
}));

const { PromoField } = await import("./promo-field");
type Applied = Parameters<typeof PromoField>[0]["applied"];

const items: CartItem[] = [
  { id: "a", kind: "product", productSlug: "banana-bread", quantity: 1 },
];

function Harness() {
  const [applied, setApplied] = useState<Applied>(null);
  return (
    <PromoField
      items={items}
      branch="bgc"
      applied={applied}
      onChange={setApplied}
    />
  );
}

const type = (code: string) =>
  fireEvent.change(screen.getByLabelText("Promo code"), {
    target: { value: code },
  });

beforeEach(() => {
  mocks.previewPromo.mockReset();
});

describe("PromoField", () => {
  it("applies a code and can remove it", async () => {
    mocks.previewPromo.mockResolvedValue({
      ok: true,
      code: "HERMES10",
      discountCentavos: 850,
      forSubtotal: 8500,
    });
    render(<Harness />);
    type("hermes10");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "HERMES10 applied: ₱8.50 off.",
    );
    expect(mocks.previewPromo).toHaveBeenCalledWith({
      code: "hermes10",
      branch: "bgc",
      items,
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByLabelText("Promo code")).toHaveValue("");
  });

  it("shows why a code was refused", async () => {
    mocks.previewPromo.mockResolvedValue({
      ok: false,
      message: "This code has expired.",
    });
    render(<Harness />);
    type("OLD");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This code has expired.",
    );
    expect(screen.getByLabelText("Promo code")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("explains a failed connection", async () => {
    mocks.previewPromo.mockRejectedValue(new Error("offline"));
    render(<Harness />);
    type("HERMES10");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not check this code/,
    );
  });

  it("applies on Enter without submitting the checkout", async () => {
    mocks.previewPromo.mockResolvedValue({ ok: false, message: "No." });
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    );
    type("HERMES10");
    const notPrevented = fireEvent.keyDown(
      screen.getByLabelText("Promo code"),
      { key: "Enter" },
    );
    expect(notPrevented).toBe(false);
    await waitFor(() => expect(mocks.previewPromo).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does nothing with an empty code or other keys", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.keyDown(screen.getByLabelText("Promo code"), { key: "a" });
    expect(mocks.previewPromo).not.toHaveBeenCalled();
  });
});
