import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { accountMenuLinks } from "./nav-items";

vi.mock("@/server/auth/actions", () => ({ logOut: vi.fn() }));

describe("accountMenuLinks", () => {
  const labels = (role: string) => accountMenuLinks(role).map((l) => l.label);

  it("gives customers their own pages only", () => {
    expect(labels("customer")).toEqual([
      "Profile",
      "Orders",
      "Receipts",
      "Rewards",
    ]);
  });

  it("adds Barista for baristas, and both staff links for admins", () => {
    expect(labels("barista")).toEqual([
      "Profile",
      "Orders",
      "Receipts",
      "Rewards",
      "Barista",
    ]);
    expect(labels("admin")).toEqual([
      "Profile",
      "Orders",
      "Receipts",
      "Rewards",
      "Barista",
      "Admin",
    ]);
  });

  it("treats unknown roles as customers", () => {
    expect(labels("superuser")).toEqual([
      "Profile",
      "Orders",
      "Receipts",
      "Rewards",
    ]);
  });
});

describe("AccountMenu", () => {
  it("offers log in and sign up when signed out", () => {
    render(<AccountMenu user={null} />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("opens a menu with the admin's links and log out", async () => {
    render(
      <AccountMenu
        user={{
          name: "Hermes Admin",
          email: "admin@example.com",
          role: "admin",
        }}
      />,
    );
    const trigger = screen.getByRole("button", { name: /Hermes Admin/ });
    fireEvent.click(trigger);

    const menu = await screen.findByRole("menu");
    const items = within(menu)
      .getAllByRole("menuitem")
      .map((item) => item.textContent);
    expect(items).toEqual([
      "Profile",
      "Orders",
      "Receipts",
      "Rewards",
      "Barista",
      "Admin",
      "Log out",
    ]);
    expect(within(menu).getByText("admin@example.com")).toBeInTheDocument();
  });

  it("hides staff links from customers", async () => {
    render(
      <AccountMenu
        user={{ name: "Maria", email: "maria@example.com", role: "customer" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Maria/ }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByText("Barista")).toBeNull();
    expect(within(menu).queryByText("Admin")).toBeNull();
  });
});
