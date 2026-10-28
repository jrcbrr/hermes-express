/**
 * Single source of truth for brand text, contact details and branches.
 * UI code must read from here instead of hard-coding these values.
 */

export type BranchService = "pickup" | "delivery";

export type Branch = {
  /** URL-safe id, also used as the seed key for the `branch` table. */
  slug: string;
  name: string;
  address: string;
  /** 24-hour "HH:MM", local Manila time. */
  opensAt: string;
  /** 24-hour "HH:MM", local Manila time. */
  closesAt: string;
  services: readonly BranchService[];
};

export const siteConfig = {
  name: "Hermes Express",
  tagline: "Brewed by you. Delivered by Hermes.",
  description:
    "Build your own coffee step by step, then pick it up or have it delivered from a Hermes Express branch.",
  contacts: {
    instagram: {
      handle: "@jrcbrr_",
      url: "https://instagram.com/jrcbrr_",
    },
    phone: {
      /** Digits only, for tel: links. */
      raw: "09390082560",
      /** Grouped for display. */
      display: "0939 008 2560",
    },
    email: "johnrudolph2010@gmail.com",
  },
  branches: [
    {
      slug: "tipas",
      name: "Tipas",
      address: "Lontoc St, Calzada, Tipas, Taguig",
      opensAt: "07:00",
      closesAt: "22:00",
      services: ["pickup", "delivery"],
    },
    {
      slug: "bgc",
      name: "BGC",
      address: "High Street Kiosk, Bonifacio Global City",
      opensAt: "07:00",
      closesAt: "23:00",
      services: ["pickup", "delivery"],
    },
    {
      slug: "taguig-lakeshore",
      name: "Taguig Lakeshore",
      address: "Lakeshore, Taguig",
      opensAt: "07:00",
      closesAt: "22:00",
      services: ["pickup", "delivery"],
    },
  ] satisfies readonly Branch[],
  demoNotice: "Demo project — payments are simulated.",
} as const;

export type SiteConfig = typeof siteConfig;
