import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn((options: unknown) => ({ options })),
  drizzleAdapter: vi.fn(() => "adapter"),
  consume: vi.fn(),
}));

vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: mocks.drizzleAdapter,
}));
vi.mock("better-auth/next-js", () => ({ nextCookies: () => "nextCookies" }));
vi.mock("@/db", () => ({ getDb: () => "db" }));
vi.mock("@/server/rate-limit", () => ({ consume: mocks.consume }));

const { getAuth, resolveBaseURL, resolveTrustedOrigins } =
  await import("./auth");

type CapturedOptions = {
  baseURL: string;
  user: {
    additionalFields: Record<
      string,
      {
        input?: boolean;
        validator?: {
          input: { "~standard": { validate: (v: unknown) => unknown } };
        };
      }
    >;
  };
  rateLimit: {
    enabled: boolean;
    customStorage: {
      consume: (key: string, rule: { window: number; max: number }) => unknown;
    };
  };
  plugins: unknown[];
};

/** The options passed to betterAuth() (the mock returns them back). */
function createdOptions(): CapturedOptions {
  return (getAuth() as unknown as { options: CapturedOptions }).options;
}

describe("resolveBaseURL", () => {
  it("prefers BETTER_AUTH_URL", () => {
    expect(
      resolveBaseURL({
        BETTER_AUTH_URL: "https://hermes-express.vercel.app",
        VERCEL_URL: "x.vercel.app",
      }),
    ).toBe("https://hermes-express.vercel.app");
  });

  it("uses the Vercel deployment URL on previews", () => {
    expect(resolveBaseURL({ VERCEL_URL: "hx-abc.vercel.app" })).toBe(
      "https://hx-abc.vercel.app",
    );
  });

  it("falls back to localhost", () => {
    expect(resolveBaseURL({})).toBe("http://localhost:3000");
  });
});

describe("resolveTrustedOrigins", () => {
  it("trusts the base URL and both Vercel preview aliases, without duplicates", () => {
    expect(
      resolveTrustedOrigins({
        VERCEL_URL: "hx-abc.vercel.app",
        VERCEL_BRANCH_URL: "hx-git-stage.vercel.app",
      }),
    ).toEqual(["https://hx-abc.vercel.app", "https://hx-git-stage.vercel.app"]);
  });

  it("is just localhost in local dev", () => {
    expect(resolveTrustedOrigins({})).toEqual(["http://localhost:3000"]);
  });
});

describe("getAuth", () => {
  beforeEach(() => mocks.consume.mockReset());

  it("creates the instance once, on first use", () => {
    expect(mocks.betterAuth).not.toHaveBeenCalled();
    const first = getAuth();
    expect(getAuth()).toBe(first);
    expect(mocks.betterAuth).toHaveBeenCalledTimes(1);
    expect(mocks.drizzleAdapter).toHaveBeenCalledWith(
      "db",
      expect.objectContaining({ provider: "pg" }),
    );
  });

  it("stops users from setting their own role, branch or points", () => {
    const options = createdOptions();
    const fields = options.user.additionalFields;
    expect(fields.role?.input).toBe(false);
    expect(fields.branchId?.input).toBe(false);
    expect(fields.pointsBalance?.input).toBe(false);
    expect(fields.phone?.input).toBeUndefined();
  });

  it("only stores phones already in +639 form", () => {
    const options = createdOptions();
    const validate =
      options.user.additionalFields.phone?.validator?.input["~standard"]
        .validate;
    expect(validate?.("+639171234567")).toEqual({ value: "+639171234567" });
    expect(validate?.("0917 123 4567")).toHaveProperty("issues");
  });

  it("rate limits through the shared Postgres limiter, with nextCookies last", () => {
    const options = createdOptions();
    expect(options.rateLimit.enabled).toBe(true);
    void options.rateLimit.customStorage.consume("1.2.3.4/sign-in/email", {
      window: 10,
      max: 3,
    });
    expect(mocks.consume).toHaveBeenCalledWith("ba:1.2.3.4/sign-in/email", {
      window: 10,
      max: 3,
    });
    expect(options.plugins.at(-1)).toBe("nextCookies");
  });
});
