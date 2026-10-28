import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { featuredDrinks } from "@/components/landing/featured-drinks.data";
import { siteConfig } from "@/config/site";
import HomePage from "./page";

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

  it("shows 4 to 6 featured drinks with peso prices", () => {
    render(<HomePage />);

    expect(featuredDrinks.length).toBeGreaterThanOrEqual(4);
    expect(featuredDrinks.length).toBeLessThanOrEqual(6);
    for (const drink of featuredDrinks) {
      expect(
        screen.getByRole("heading", { level: 3, name: drink.name }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByText("₱175")).toHaveLength(2);
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
