import { describe, expect, it } from "vitest";
import {
  describePromo,
  evaluatePromo,
  normalizePromoCode,
  PROMO_NOT_FOUND,
  type PromoRule,
} from "./promos";

const NOW = new Date("2026-11-15T02:00:00Z");
const percent: PromoRule = {
  code: "HERMES10",
  type: "percent",
  value: 10,
  maxDiscountCentavos: 10000,
  minSubtotalCentavos: 0,
  firstOrderOnly: false,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  isActive: true,
};
const fixed: PromoRule = {
  ...percent,
  code: "FIRSTSIP",
  type: "fixed",
  value: 5000,
  maxDiscountCentavos: null,
  minSubtotalCentavos: 15000,
  firstOrderOnly: true,
};
const context = { subtotalCentavos: 50000, hasPriorOrders: false, now: NOW };

describe("evaluatePromo", () => {
  it("takes a percentage off", () => {
    expect(evaluatePromo(percent, context)).toEqual({
      ok: true,
      discountCentavos: 5000,
    });
  });

  it("caps a percentage at the maximum discount", () => {
    expect(
      evaluatePromo(percent, { ...context, subtotalCentavos: 500000 }),
    ).toEqual({ ok: true, discountCentavos: 10000 });
  });

  it("takes a fixed amount off", () => {
    expect(evaluatePromo(fixed, context)).toEqual({
      ok: true,
      discountCentavos: 5000,
    });
  });

  it("never takes off more than the subtotal", () => {
    expect(
      evaluatePromo(
        { ...fixed, minSubtotalCentavos: 0 },
        { ...context, subtotalCentavos: 3000 },
      ),
    ).toEqual({ ok: true, discountCentavos: 3000 });
  });

  it("treats a switched-off code as missing", () => {
    expect(evaluatePromo({ ...percent, isActive: false }, context)).toEqual({
      ok: false,
      message: PROMO_NOT_FOUND,
    });
  });

  it("rejects a code before it starts, and accepts it from then", () => {
    const startsAt = new Date(NOW.getTime() + 1);
    expect(evaluatePromo({ ...percent, startsAt }, context).ok).toBe(false);
    expect(evaluatePromo({ ...percent, startsAt: NOW }, context).ok).toBe(true);
  });

  it("rejects a code after it ends, and accepts it until then", () => {
    const endsAt = new Date(NOW.getTime() - 1);
    expect(evaluatePromo({ ...percent, endsAt }, context)).toEqual({
      ok: false,
      message: "This code has expired.",
    });
    expect(evaluatePromo({ ...percent, endsAt: NOW }, context).ok).toBe(true);
  });

  it("stops at the maximum uses", () => {
    expect(
      evaluatePromo({ ...percent, maxUses: 2, usedCount: 2 }, context),
    ).toEqual({ ok: false, message: "This code has reached its limit." });
    expect(
      evaluatePromo({ ...percent, maxUses: 2, usedCount: 1 }, context).ok,
    ).toBe(true);
  });

  it("keeps a first-order code to first orders", () => {
    expect(evaluatePromo(fixed, { ...context, hasPriorOrders: true })).toEqual({
      ok: false,
      message: "This code is for your first order only.",
    });
  });

  it("needs the minimum subtotal, exactly reached is enough", () => {
    expect(
      evaluatePromo(fixed, { ...context, subtotalCentavos: 14999 }),
    ).toEqual({
      ok: false,
      message: "This code needs an order of at least ₱150.",
    });
    expect(
      evaluatePromo(fixed, { ...context, subtotalCentavos: 15000 }).ok,
    ).toBe(true);
  });
});

describe("helpers", () => {
  it("normalizes what customers type", () => {
    expect(normalizePromoCode("  hermes10 ")).toBe("HERMES10");
  });

  it("describes a code", () => {
    expect(describePromo(percent)).toBe("10% off, up to ₱100");
    expect(describePromo(fixed)).toBe("₱50 off");
  });
});
