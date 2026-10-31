import { z } from "zod";
import { DELIVERY_CITY, isDeliveryBarangay } from "@/config/delivery-areas";
import { siteConfig } from "@/config/site";
import { emailSchema, personNameSchema, phoneSchema } from "./auth";
import { cartItemsSchema } from "./cart";

/**
 * The checkout form, checked the same way in the browser (to show errors
 * early) and in placeOrder (the real check). Prices are never part of it.
 */

export const PAYMENT_METHODS = [
  "gcash_demo",
  "card_demo",
  "cash_pickup",
  "cod",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  gcash_demo: "GCash (Demo)",
  card_demo: "Card (Demo)",
  cash_pickup: "Cash at Pickup",
  cod: "Cash on Delivery",
};

/** Demo payments are always "paid"; cash is collected at the counter or door. */
export type PaymentStatus = "demo_paid" | "unpaid";

export function isCashPayment(method: PaymentMethod): boolean {
  return method === "cod" || method === "cash_pickup";
}

export function paymentStatusFor(method: PaymentMethod): PaymentStatus {
  return isCashPayment(method) ? "unpaid" : "demo_paid";
}

/** Payment methods offered for pickup or delivery. */
export function paymentMethodsFor(
  fulfillment: "pickup" | "delivery",
): PaymentMethod[] {
  const otherCash = fulfillment === "delivery" ? "cash_pickup" : "cod";
  return PAYMENT_METHODS.filter((m) => m !== otherCash);
}

export const NOTE_MAX_LENGTH = 200;
export const STREET_MAX_LENGTH = 200;
export const PROMO_CODE_MAX_LENGTH = 20;

const branchSlugs = siteConfig.branches.map((b) => b.slug);

export const checkoutSchema = z
  .object({
    /** Made by the browser once per checkout, so a double tap can't order twice. */
    clientRequestId: z.uuid("Please reload the page and try again."),
    fulfillment: z.enum(
      ["pickup", "delivery"],
      "Please choose pickup or delivery.",
    ),
    branch: z
      .string()
      .refine((slug) => branchSlugs.includes(slug), "Please choose a branch."),
    contactName: personNameSchema,
    phone: phoneSchema,
    receiptEmail: emailSchema,
    street: z
      .string()
      .trim()
      .max(
        STREET_MAX_LENGTH,
        `Please keep the address under ${STREET_MAX_LENGTH} characters.`,
      )
      .default(""),
    barangay: z.string().trim().default(""),
    note: z
      .string()
      .trim()
      .max(
        NOTE_MAX_LENGTH,
        `Please keep the note under ${NOTE_MAX_LENGTH} characters.`,
      )
      .default(""),
    timing: z.enum(
      ["asap", "scheduled"],
      "Please choose when you would like your order.",
    ),
    /** ISO date-time of the chosen slot; only for scheduled orders. */
    scheduledFor: z.iso.datetime("Please choose a time.").optional(),
    paymentMethod: z.enum(PAYMENT_METHODS, "Please choose a payment method."),
    /** Checked and priced again by placeOrder. */
    promoCode: z.string().trim().max(PROMO_CODE_MAX_LENGTH).optional(),
    // Stage 8: pointsToRedeem joins here.
    items: cartItemsSchema.min(1, "Your cart is empty."),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment === "delivery") {
      if (data.street.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["street"],
          message:
            "Please enter your house or unit number, building and street.",
        });
      }
      if (!isDeliveryBarangay(data.barangay)) {
        ctx.addIssue({
          code: "custom",
          path: ["barangay"],
          message: `We deliver within ${DELIVERY_CITY} only. Please choose your barangay.`,
        });
      }
    }
    if (data.timing === "scheduled" && data.scheduledFor === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduledFor"],
        message: "Please choose a time.",
      });
    }
    if (data.paymentMethod === "cod" && data.fulfillment !== "delivery") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Cash on Delivery is only for delivery orders.",
      });
    }
    if (data.paymentMethod === "cash_pickup" && data.fulfillment !== "pickup") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Cash at Pickup is only for pickup orders.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    address:
      data.fulfillment === "delivery"
        ? `${data.street}, ${data.barangay}, ${DELIVERY_CITY}`
        : null,
    scheduledFor:
      data.timing === "scheduled" && data.scheduledFor !== undefined
        ? new Date(data.scheduledFor)
        : null,
  }));

/** What the browser sends to placeOrder. */
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
