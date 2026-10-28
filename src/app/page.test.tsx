import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import HomePage from "./page";

describe("HomePage", () => {
  it("shows the brand name as the main heading and the tagline", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: siteConfig.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(siteConfig.tagline)).toBeInTheDocument();
  });
});
