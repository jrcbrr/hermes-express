/**
 * Promo codes (docs/PLAN.md §6). Pure functions: the server loads the code and
 * the customer's history, and this decides whether it applies and for how much.
 */
import type { PromoType } from "./catalog";
import { formatPeso, percentOfCentavos } from "./money";

export type PromoRule = {
  code: string;
  type: PromoType;
  /** Percent (1–100) for "percent"; centavos for "fixed". */
  value: number;
  maxDiscountCentavos: number | null;
  minSubtotalCentavos: number;
  firstOrderOnly: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
};

export type PromoResult =
  { ok: true; discountCentavos: number } | { ok: false; message: string };

export const PROMO_NOT_FOUND = "We could not find this code.";

/** Codes are stored in capitals, so customers can type them in any case. */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/** The discount before any limits. */
function rawDiscount(promo: PromoRule, subtotalCentavos: number): number {
  return promo.type === "percent"
    ? percentOfCentavos(subtotalCentavos, promo.value)
    : promo.value;
}

/** Whether a code applies to this order, and how much it takes off. */
export function evaluatePromo(
  promo: PromoRule,
  {
    subtotalCentavos,
    hasPriorOrders,
    now,
  }: { subtotalCentavos: number; hasPriorOrders: boolean; now: Date },
): PromoResult {
  if (!promo.isActive) return { ok: false, message: PROMO_NOT_FOUND };
  if (promo.startsAt !== null && now < promo.startsAt) {
    return { ok: false, message: "This code is not active yet." };
  }
  if (promo.endsAt !== null && now > promo.endsAt) {
    return { ok: false, message: "This code has expired." };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, message: "This code has reached its limit." };
  }
  if (promo.firstOrderOnly && hasPriorOrders) {
    return { ok: false, message: "This code is for your first order only." };
  }
  if (subtotalCentavos < promo.minSubtotalCentavos) {
    return {
      ok: false,
      message: `This code needs an order of at least ${formatPeso(promo.minSubtotalCentavos)}.`,
    };
  }
  const capped =
    promo.maxDiscountCentavos === null
      ? rawDiscount(promo, subtotalCentavos)
      : Math.min(
          rawDiscount(promo, subtotalCentavos),
          promo.maxDiscountCentavos,
        );
  return { ok: true, discountCentavos: Math.min(capped, subtotalCentavos) };
}

/** "10% off, up to ₱100", "₱50 off". For the admin list. */
export function describePromo(
  promo: Pick<PromoRule, "type" | "value" | "maxDiscountCentavos">,
): string {
  const off =
    promo.type === "percent"
      ? `${promo.value}% off`
      : `${formatPeso(promo.value)} off`;
  return promo.maxDiscountCentavos === null
    ? off
    : `${off}, up to ${formatPeso(promo.maxDiscountCentavos)}`;
}
