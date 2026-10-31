import { describe, expect, it } from "vitest";
import { promoCodeSchema, promoFormSchema } from "./promo";

const form = {
  type: "percent",
  value: "10",
  maxDiscount: "100",
  minSubtotal: "",
  firstOrderOnly: "",
  startsAt: "",
  endsAt: "",
  maxUses: "",
  isActive: "on",
};
const field = (values: Record<string, string>) =>
  promoFormSchema.safeParse({ ...form, ...values }).error?.issues[0]?.path[0];

describe("promoCodeSchema", () => {
  it("stores capitals", () => {
    expect(promoCodeSchema.parse(" rainy1 ")).toBe("RAINY1");
  });

  it.each(["AB", "HAS SPACE", "A-B-C", "X".repeat(21)])(
    "rejects %j",
    (code) => {
      expect(promoCodeSchema.safeParse(code).success).toBe(false);
    },
  );
});

describe("promoFormSchema", () => {
  it("reads a percent code", () => {
    expect(promoFormSchema.parse(form)).toMatchObject({
      value: 10,
      maxDiscount: 10000,
      minSubtotal: null,
      maxUses: null,
      isActive: true,
      firstOrderOnly: false,
    });
  });

  it("turns a fixed amount into centavos", () => {
    expect(
      promoFormSchema.parse({ ...form, type: "fixed", value: "49.50" }).value,
    ).toBe(4950);
  });

  it.each(["0", "101", "1.5", "abc", ""])("rejects percent %j", (value) => {
    expect(field({ value })).toBe("value");
  });

  it.each(["0", "abc", ""])("rejects amount %j", (value) => {
    expect(field({ type: "fixed", value })).toBe("value");
  });

  it("rejects bad optional fields", () => {
    expect(field({ maxDiscount: "abc" })).toBe("maxDiscount");
    expect(field({ maxUses: "0" })).toBe("maxUses");
    expect(field({ maxUses: "1.5" })).toBe("maxUses");
    expect(field({ startsAt: "2026-02-31" })).toBe("startsAt");
    expect(field({ type: "unknown" })).toBe("type");
  });

  it("rejects a last day before the first", () => {
    expect(field({ startsAt: "2026-12-31", endsAt: "2026-12-01" })).toBe(
      "endsAt",
    );
  });
});
