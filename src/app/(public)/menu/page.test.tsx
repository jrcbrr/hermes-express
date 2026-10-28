import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The live part has its own tests (src/components/menu/menu.test.tsx).
vi.mock("@/components/menu/menu-content", () => ({
  MenuContent: () => <p>Menu content</p>,
}));

const { default: MenuPage, metadata } = await import("./page");

describe("MenuPage", () => {
  it("has a Menu heading and the live menu below it", () => {
    render(<MenuPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Menu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Menu content")).toBeInTheDocument();
  });

  it("sets the page title", () => {
    expect(metadata.title).toBe("Menu");
  });
});
