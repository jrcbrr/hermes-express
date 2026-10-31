import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setPromoActive: vi.fn() }));
vi.mock("@/server/admin/promo-actions", () => ({
  createPromo: vi.fn(async () => ({})),
  updatePromo: vi.fn(async () => ({})),
  setPromoActive: mocks.setPromoActive,
}));

const { PromoActiveToggle } = await import("./promo-active-toggle");
const { PromoForm } = await import("./promo-form");

const values = {
  code: "",
  type: "percent" as const,
  value: "",
  maxDiscount: "",
  minSubtotal: "",
  firstOrderOnly: false,
  startsAt: "",
  endsAt: "",
  maxUses: "",
  isActive: true,
};

beforeEach(() => {
  mocks.setPromoActive.mockReset();
});

describe("PromoForm", () => {
  it("asks for a code only when creating", () => {
    const { unmount } = render(<PromoForm initial={values} />);
    expect(screen.getByLabelText("Code")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create code" }),
    ).toBeInTheDocument();
    unmount();

    render(<PromoForm initial={{ ...values, id: "p1", code: "RAINY" }} />);
    expect(screen.queryByLabelText("Code")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("labels the value for the chosen type", () => {
    render(<PromoForm initial={values} />);
    expect(screen.getByRole("textbox", { name: "Percent off" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "fixed" },
    });
    expect(screen.getByLabelText("Amount off in pesos")).toBeVisible();
  });
});

describe("PromoActiveToggle", () => {
  it("switches a code off", async () => {
    mocks.setPromoActive.mockResolvedValue({ ok: true });
    render(<PromoActiveToggle id="p1" code="RAINY" isActive />);
    fireEvent.click(screen.getByRole("button", { name: "Switch off: RAINY" }));
    await waitFor(() =>
      expect(mocks.setPromoActive).toHaveBeenCalledWith({
        id: "p1",
        active: false,
      }),
    );
  });

  it("shows why it failed", async () => {
    mocks.setPromoActive.mockResolvedValue({ ok: false, message: "Nope" });
    render(<PromoActiveToggle id="p1" code="RAINY" isActive={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Switch on: RAINY" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
  });
});
