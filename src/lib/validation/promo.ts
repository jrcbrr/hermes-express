import { z } from "zod";
import { manilaDayRange } from "@/lib/admin";
import { PROMO_TYPES } from "@/lib/catalog";
import { pesosToCentavos } from "@/lib/money";
import { normalizePromoCode } from "@/lib/promos";

const PESOS = /^\d{1,6}(\.\d{1,2})?$/;

/** Empty means no amount. */
const optionalPesos = z
  .string()
  .trim()
  .regex(/^(\d{1,6}(\.\d{1,2})?)?$/, "Please enter an amount such as 150.")
  .transform((value) => (value === "" ? null : pesosToCentavos(Number(value))));

const optionalDate = z
  .string()
  .refine(
    (value) => value === "" || manilaDayRange(value) !== null,
    "Please choose a valid date.",
  );

export const promoCodeSchema = z
  .string()
  .transform(normalizePromoCode)
  .pipe(
    z
      .string()
      .regex(
        /^[A-Z0-9]{3,20}$/,
        "Please use 3 to 20 letters and numbers, with no spaces.",
      ),
  );

export const promoFormSchema = z
  .object({
    type: z.enum(PROMO_TYPES, "Please choose a type."),
    value: z.string().trim(),
    maxDiscount: optionalPesos,
    minSubtotal: optionalPesos,
    firstOrderOnly: z.string().transform((value) => value === "on"),
    startsAt: optionalDate,
    endsAt: optionalDate,
    maxUses: z
      .string()
      .trim()
      .regex(/^(\d{1,7})?$/, "Please enter a whole number, or leave it empty.")
      .transform((value) => (value === "" ? null : Number(value)))
      .refine(
        (value) => value !== 0,
        "Please enter at least 1, or leave it empty.",
      ),
    isActive: z.string().transform((value) => value === "on"),
  })
  .transform((data, ctx) => {
    let value = 0;
    if (data.type === "percent") {
      value = /^\d{1,3}$/.test(data.value) ? Number(data.value) : 0;
      if (value < 1 || value > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Please enter a whole percent from 1 to 100.",
        });
      }
    } else {
      value = PESOS.test(data.value) ? pesosToCentavos(Number(data.value)) : 0;
      if (value < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "Please enter an amount such as 50.",
        });
      }
    }
    // "YYYY-MM-DD" strings sort in date order.
    if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The last day cannot be before the first day.",
      });
    }
    return { ...data, value };
  });
