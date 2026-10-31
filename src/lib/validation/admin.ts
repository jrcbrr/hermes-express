import { z } from "zod";
import { manilaDayRange } from "@/lib/admin";
import { pesosToCentavos } from "@/lib/money";
import { ROLES } from "@/lib/roles";
import { normalizePhPhone, profileSchema } from "./auth";

/** Up to ₱999,999.99, typed in pesos and stored as centavos. */
const pesos = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "Please enter a price such as 150 or 49.50.")
  .transform((value) => pesosToCentavos(Number(value)));

const checkbox = z.string().transform((value) => value === "on");

const productDate = z
  .string()
  .refine(
    (value) => value === "" || manilaDayRange(value) !== null,
    "Please choose a valid date.",
  );

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter a name (at least 2 characters).")
      .max(80, "Please keep the name under 80 characters."),
    description: z
      .string()
      .trim()
      .max(300, "Please keep the description under 300 characters."),
    price: pesos,
    isSeasonal: checkbox,
    availableFrom: productDate,
    availableTo: productDate,
    isActive: checkbox,
  })
  .superRefine((value, ctx) => {
    if (!value.isSeasonal) return;
    if (!value.availableFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["availableFrom"],
        message: "Please choose the first day this item is available.",
      });
    }
    if (!value.availableTo) {
      ctx.addIssue({
        code: "custom",
        path: ["availableTo"],
        message: "Please choose the last day this item is available.",
      });
    }
    // "YYYY-MM-DD" strings sort in date order.
    if (
      value.availableFrom &&
      value.availableTo &&
      value.availableFrom > value.availableTo
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["availableTo"],
        message: "The last day cannot be before the first day.",
      });
    }
  });

export const ingredientFormSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Please enter a name (at least 2 characters).")
    .max(60, "Please keep the name under 60 characters."),
  price: pesos,
  color: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6})?$/, "Please choose a valid colour.")
    .transform((value) => value.toUpperCase()),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Please enter a whole number from 0 to 9999.")
    .transform(Number),
  isActive: checkbox,
});

/** Like the customer's own profile, but staff accounts may have no phone yet. */
export const customerFormSchema = profileSchema.extend({
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const normalized = normalizePhPhone(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message:
            "Please enter a valid Philippine mobile number, for example 0917 123 4567.",
        });
        return z.NEVER;
      }
      return normalized;
    }),
});

export const roleFormSchema = z
  .object({
    role: z.enum(ROLES, "Please choose a role."),
    branchId: z.string(),
  })
  .refine((value) => value.role !== "barista" || value.branchId !== "", {
    path: ["branchId"],
    message: "Please choose the barista's branch.",
  });

export const pointsFormSchema = z.object({
  delta: z
    .string()
    .trim()
    .regex(/^[+-]?\d{1,6}$/, "Please enter a whole number, such as 50 or -50.")
    .transform(Number)
    .refine((value) => value !== 0, "Please enter a number other than zero."),
  note: z
    .string()
    .trim()
    .min(1, "Please give a reason for this adjustment.")
    .max(200, "Please keep the reason under 200 characters."),
});
