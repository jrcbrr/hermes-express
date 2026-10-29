import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { menuPhotoCredits } from "@/config/photo-credits";
import { productSeeds } from "@/db/catalog-data";

const { default: CreditsPage, metadata } = await import("./page");

describe("CreditsPage", () => {
  it("credits the photo of every menu item", () => {
    render(<CreditsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Photo credits" }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(productSeeds.length);
  });

  it("names the photographer and links the licence and source", () => {
    render(<CreditsPage />);
    const item = screen.getByText("Winged Mocha").closest("li")!;
    expect(item).toHaveTextContent("Photo by Monika Wahi");
    expect(
      within(item).getByRole("link", { name: /CC BY-SA 3\.0/ }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/3.0/",
    );
    expect(
      within(item).getByRole("link", { name: /Source.*Winged Mocha photo/ }),
    ).toHaveAttribute("href", menuPhotoCredits["winged-mocha"]!.sourceUrl);
  });

  it("shows public-domain licences as text and mentions changes", () => {
    render(<CreditsPage />);
    const cookie = screen.getByText("Chocolate Chip Cookie").closest("li")!;
    expect(cookie).toHaveTextContent("Public domain");
    expect(within(cookie).getAllByRole("link")).toHaveLength(1);
    const frappe = screen.getByText("Elysian Matcha Frappe").closest("li")!;
    expect(frappe).toHaveTextContent("Cropped to show one drink.");
  });

  it("sets the page title", () => {
    expect(metadata.title).toBe("Photo credits");
  });
});
