import { describe, expect, it } from "vitest";
import { siteConfig } from "./site";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

describe("siteConfig", () => {
  it("has the brand name and tagline", () => {
    expect(siteConfig.name).toBe("Hermes Express");
    expect(siteConfig.tagline).toBe("Brewed by you. Delivered by Hermes.");
  });

  it("has a PH mobile number whose display form matches the raw digits", () => {
    const { raw, display } = siteConfig.contacts.phone;
    expect(raw).toMatch(/^09\d{9}$/);
    expect(display.replace(/\s/g, "")).toBe(raw);
  });

  it("has a valid email and Instagram link", () => {
    expect(siteConfig.contacts.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const { handle, url } = siteConfig.contacts.instagram;
    expect(url).toBe(`https://instagram.com/${handle.replace(/^@/, "")}`);
  });

  it("lists exactly 3 branches with unique slugs", () => {
    const slugs = siteConfig.branches.map((b) => b.slug);
    expect(slugs).toHaveLength(3);
    expect(new Set(slugs).size).toBe(3);
  });

  it.each(siteConfig.branches)("$name opens before it closes", (branch) => {
    expect(branch.opensAt).toMatch(HH_MM);
    expect(branch.closesAt).toMatch(HH_MM);
    expect(branch.opensAt < branch.closesAt).toBe(true);
  });
});
