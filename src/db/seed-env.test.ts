import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import {
  BARISTA_PASSWORD_VARS,
  baristaEmail,
  DEMO_CUSTOMER_EMAIL,
  parseSeedArgs,
  readDemoCustomerSeed,
  readStaffSeeds,
} from "./seed-env";

const validEnv = {
  SEED_ADMIN_EMAIL: " Admin@Example.com ",
  SEED_ADMIN_PASSWORD: "admin-password",
  SEED_BARISTA_TIPAS_PASSWORD: "tipas-password",
  SEED_BARISTA_BGC_PASSWORD: "bgc-password",
  SEED_BARISTA_LAKESHORE_PASSWORD: "lakeshore-password",
};

describe("readStaffSeeds", () => {
  it("has a password variable for every branch in the site config", () => {
    for (const branch of siteConfig.branches) {
      expect(BARISTA_PASSWORD_VARS[branch.slug]).toBeDefined();
    }
  });

  it("returns one admin and one barista per branch, each with their own password", () => {
    const staff = readStaffSeeds(validEnv);
    expect(staff).toHaveLength(1 + siteConfig.branches.length);
    expect(staff[0]).toMatchObject({
      email: "admin@example.com",
      role: "admin",
      branchSlug: null,
    });
    expect(
      staff.slice(1).map((s) => [s.email, s.password, s.branchSlug]),
    ).toEqual([
      [baristaEmail("tipas"), "tipas-password", "tipas"],
      [baristaEmail("bgc"), "bgc-password", "bgc"],
      [
        baristaEmail("taguig-lakeshore"),
        "lakeshore-password",
        "taguig-lakeshore",
      ],
    ]);
  });

  it("lists every missing or short variable in one clear error", () => {
    expect(() =>
      readStaffSeeds({
        ...validEnv,
        SEED_ADMIN_EMAIL: "",
        SEED_BARISTA_BGC_PASSWORD: "short",
        SEED_BARISTA_LAKESHORE_PASSWORD: undefined,
      }),
    ).toThrow(
      [
        "Cannot seed staff accounts. Fix these in .env.local:",
        "- SEED_ADMIN_EMAIL is missing.",
        "- SEED_BARISTA_BGC_PASSWORD must be at least 8 characters.",
        "- SEED_BARISTA_LAKESHORE_PASSWORD is missing.",
      ].join("\n"),
    );
  });
});

describe("readDemoCustomerSeed", () => {
  it("is optional", () => {
    expect(readDemoCustomerSeed({})).toBeNull();
  });

  it("creates a plain customer with no branch", () => {
    expect(
      readDemoCustomerSeed({ SEED_DEMO_CUSTOMER_PASSWORD: "demo-password" }),
    ).toMatchObject({
      email: DEMO_CUSTOMER_EMAIL,
      role: "customer",
      branchSlug: null,
    });
  });

  it("refuses a short password", () => {
    expect(() =>
      readDemoCustomerSeed({ SEED_DEMO_CUSTOMER_PASSWORD: "short" }),
    ).toThrow("at least 8 characters");
  });
});

describe("parseSeedArgs", () => {
  it("never resets passwords by default", () => {
    expect(parseSeedArgs([])).toEqual({ resetPasswords: false });
  });

  it("resets passwords only when asked", () => {
    expect(parseSeedArgs(["--reset-passwords"])).toEqual({
      resetPasswords: true,
    });
  });

  it("rejects unknown or misspelled options", () => {
    expect(() => parseSeedArgs(["--reset-password"])).toThrow(
      'Unknown seed option "--reset-password"',
    );
  });
});
