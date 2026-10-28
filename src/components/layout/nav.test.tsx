import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopNav } from "./desktop-nav";
import { MobileTabBar } from "./mobile-tab-bar";
import { isActivePath } from "./nav-items";
import { SiteHeader } from "./site-header";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/";
});

describe("isActivePath", () => {
  it("matches Home only on the home page", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/menu", "/")).toBe(false);
  });

  it("matches a section and its sub-pages, not look-alike paths", () => {
    expect(isActivePath("/menu", "/menu")).toBe(true);
    expect(isActivePath("/orders/HX-1", "/orders")).toBe(true);
    expect(isActivePath("/menus", "/menu")).toBe(false);
  });
});

describe("MobileTabBar", () => {
  it("shows the five tabs in order with Build in the centre", () => {
    render(<MobileTabBar />);
    const nav = screen.getByRole("navigation", { name: "Tabs" });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Home",
      "Menu",
      "Build",
      "Cart",
      "Profile",
    ]);
    expect(links[2]).toHaveAttribute("href", "/build");
    expect(
      within(links[2]).getByTestId("build-tab-button"),
    ).toBeInTheDocument();
  });

  it("marks the current tab", () => {
    pathname.current = "/cart";
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("DesktopNav", () => {
  it("lists the main links and marks the current page", () => {
    pathname.current = "/build";
    render(<DesktopNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });

    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Home", "Menu", "Build Your Drink", "Rewards"]);
    expect(
      within(nav).getByRole("link", { name: "Build Your Drink" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe("SiteHeader", () => {
  it("has the logo, cart, sound and theme controls, and sign in", () => {
    render(<SiteHeader />);
    const header = within(screen.getByRole("banner"));

    expect(
      header.getByRole("link", { name: /Hermes Express/ }),
    ).toHaveAttribute("href", "/");
    expect(header.getByRole("link", { name: "Cart" })).toHaveAttribute(
      "href",
      "/cart",
    );
    expect(
      header.getByRole("button", { name: "Mute sounds" }),
    ).toBeInTheDocument();
    expect(
      header.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeInTheDocument();
    expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
