import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { formatTime } from "@/lib/format";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("links to every contact from the site config", () => {
    render(<SiteFooter />);
    const { instagram, phone, email } = siteConfig.contacts;

    expect(
      screen.getByRole("link", { name: new RegExp(instagram.handle) }),
    ).toHaveAttribute("href", instagram.url);
    expect(screen.getByRole("link", { name: phone.display })).toHaveAttribute(
      "href",
      `tel:${phone.raw}`,
    );
    expect(screen.getByRole("link", { name: email })).toHaveAttribute(
      "href",
      `mailto:${email}`,
    );
  });

  it("lists each branch with its hours, and the demo notice", () => {
    render(<SiteFooter />);
    const region = within(screen.getByRole("region", { name: "Our branches" }));

    expect(region.getAllByRole("listitem")).toHaveLength(
      siteConfig.branches.length,
    );
    for (const branch of siteConfig.branches) {
      expect(region.getByText(branch.name)).toBeInTheDocument();
    }
    const bgc = siteConfig.branches[1];
    expect(
      region.getByText(
        `${formatTime(bgc.opensAt)} – ${formatTime(bgc.closesAt)}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(siteConfig.demoNotice)).toBeInTheDocument();
  });
});
