import { beforeEach, describe, expect, it, vi } from "vitest";

const returning = vi.hoisted(() => vi.fn());
const chain = vi.hoisted(() => {
  const c = {
    insert: vi.fn(() => c),
    values: vi.fn(() => c),
    onConflictDoUpdate: vi.fn(() => c),
    returning,
  };
  return c;
});
vi.mock("@/db", () => ({ getDb: () => chain }));

const { AUTH_EMAIL_RATE_LIMIT, AUTH_IP_RATE_LIMIT, consume, decide } =
  await import("./rate-limit");

const rule = { window: 60, max: 5 };
const now = 1_000_000;

describe("decide", () => {
  it("allows up to the limit", () => {
    expect(decide({ count: 5, windowStart: now }, rule, now)).toEqual({
      allowed: true,
      retryAfter: null,
    });
  });

  it("blocks past the limit and says when to retry", () => {
    expect(decide({ count: 6, windowStart: now - 45_000 }, rule, now)).toEqual({
      allowed: false,
      retryAfter: 15,
    });
  });

  it("never asks to wait less than a second", () => {
    expect(
      decide({ count: 6, windowStart: now - 60_000 }, rule, now).retryAfter,
    ).toBe(1);
  });
});

describe("consume", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts the counter in one statement and decides from the result", async () => {
    returning.mockResolvedValueOnce([{ count: 6, windowStart: now - 30_000 }]);
    await expect(consume("login:ip:1.2.3.4", rule, now)).resolves.toEqual({
      allowed: false,
      retryAfter: 30,
    });
    expect(chain.values).toHaveBeenCalledWith({
      key: "login:ip:1.2.3.4",
      count: 1,
      windowStart: now,
    });
    expect(chain.onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("allows the request if the database returns no row", async () => {
    returning.mockResolvedValueOnce([]);
    await expect(consume("k", AUTH_EMAIL_RATE_LIMIT)).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
  });
});

describe("auth limits", () => {
  it("are looser per IP (shared mobile IPs) than per email", () => {
    expect(AUTH_IP_RATE_LIMIT).toEqual({ window: 60, max: 30 });
    expect(AUTH_EMAIL_RATE_LIMIT).toEqual({ window: 60, max: 5 });
  });
});
