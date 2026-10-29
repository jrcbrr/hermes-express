import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/config/site";

// The database-backed drink cards have their own tests
// (src/components/landing/featured-drinks.test.tsx).
vi.mock("@/components/landing/featured-drink-list", () => ({
  FeaturedDrinkList: () => <p>Featured drink cards</p>,
}));

const { default: HomePage } = await import("./page");

describe("HomePage", () => {
  it("uses the tagline as the main heading, with both calls to action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: siteConfig.tagline }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Build Your Drink" }),
    ).toHaveAttribute("href", "/build");
    expect(screen.getByRole("link", { name: "View Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
    expect(
      screen.getByRole("img", { name: /glass filling with layered coffee/ }),
    ).toBeInTheDocument();
  });

  it("has every landing section from the plan", () => {
    render(<HomePage />);

    for (const name of [
      "How it works",
      "Featured drinks",
      "Craft it, layer by layer",
      "Earn points with every cup",
      "Visit a branch",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("shows the featured drinks inside their section", () => {
    render(<HomePage />);
    expect(screen.getByText("Featured drink cards")).toBeInTheDocument();
    expect(
      screen.getByText("Prices shown are for a 12oz cup."),
    ).toBeInTheDocument();
  });

  it("lists every branch", () => {
    render(<HomePage />);
    for (const branch of siteConfig.branches) {
      expect(
        screen.getByRole("heading", { level: 3, name: branch.name }),
      ).toBeInTheDocument();
    }
  });
});
