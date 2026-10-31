import { describe, expect, it } from "vitest";
import { MAX_CART_LINES } from "@/lib/cart";
import { toFieldErrors } from "./auth";
import { cartItemsSchema, validCartItems } from "./cart";
import {
  checkoutSchema,
  paymentMethodsFor,
  paymentStatusFor,
  type CheckoutInput,
} from "./checkout";

const latte = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  milk: "whole",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
} as const;

const base: CheckoutInput = {
  clientRequestId: "0b7c4f5e-2f4a-4c1e-9a8e-1d2c3b4a5f60",
  fulfillment: "pickup",
  branch: "bgc",
  contactName: "Maria Santos",
  phone: "0917 123 4567",
  receiptEmail: "Maria@Example.com",
  timing: "asap",
  paymentMethod: "gcash_demo",
  items: [
    { id: "a", kind: "product", productSlug: "butter-croissant", quantity: 1 },
  ],
};

function errors(input: unknown) {
  const result = checkoutSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("checkoutSchema", () => {
  it("accepts a pickup order and tidies the contact details", () => {
    const data = checkoutSchema.parse(base);
    expect(data).toMatchObject({
      phone: "+639171234567",
      receiptEmail: "maria@example.com",
      address: null,
      scheduledFor: null,
      note: "",
    });
  });

  it("builds the delivery address in Taguig", () => {
    const data = checkoutSchema.parse({
      ...base,
      fulfillment: "delivery",
      street: " Unit 5, 26th St ",
      barangay: "Fort Bonifacio (BGC)",
      paymentMethod: "cod",
    });
    expect(data.address).toBe(
      "Unit 5, 26th St, Fort Bonifacio (BGC), Taguig City",
    );
  });

  it("only delivers within Taguig", () => {
    const result = errors({
      ...base,
      fulfillment: "delivery",
      street: "1 Ayala Ave",
      barangay: "Poblacion, Makati",
    });
    expect(result.barangay).toMatch(/within Taguig City only/);
    expect(
      errors({ ...base, fulfillment: "delivery", barangay: "Wawa" }).street,
    ).toMatch(/house or unit number/);
  });

  it("ignores address fields for pickup", () => {
    expect(
      checkoutSchema.parse({ ...base, barangay: "Nowhere" }).address,
    ).toBeNull();
  });

  it("needs a time for scheduled orders", () => {
    expect(errors({ ...base, timing: "scheduled" }).scheduledFor).toBe(
      "Please choose a time.",
    );
    expect(
      errors({ ...base, timing: "scheduled", scheduledFor: "tomorrow" })
        .scheduledFor,
    ).toBe("Please choose a time.");
    const data = checkoutSchema.parse({
      ...base,
      timing: "scheduled",
      scheduledFor: "2026-11-15T04:15:00.000Z",
    });
    expect(data.scheduledFor).toEqual(new Date("2026-11-15T04:15:00.000Z"));
  });

  it("drops a slot sent with an ASAP order", () => {
    expect(
      checkoutSchema.parse({
        ...base,
        scheduledFor: "2026-11-15T04:15:00.000Z",
      }).scheduledFor,
    ).toBeNull();
  });

  it("keeps Cash on Delivery for delivery orders", () => {
    expect(errors({ ...base, paymentMethod: "cod" }).paymentMethod).toMatch(
      /only for delivery/,
    );
    expect(errors({ ...base, paymentMethod: "bitcoin" }).paymentMethod).toBe(
      "Please choose a payment method.",
    );
  });

  it("rejects bad contact details, branches and notes", () => {
    const result = errors({
      ...base,
      contactName: "M",
      phone: "12345",
      receiptEmail: "nope",
      branch: "makati",
      note: "x".repeat(201),
      clientRequestId: "1",
      fulfillment: "drone",
      timing: "never",
    });
    expect(Object.keys(result).sort()).toEqual([
      "branch",
      "clientRequestId",
      "contactName",
      "fulfillment",
      "note",
      "phone",
      "receiptEmail",
      "timing",
    ]);
  });

  it("needs at least one item", () => {
    expect(errors({ ...base, items: [] }).items).toBe("Your cart is empty.");
  });

  it("strips prices the browser tries to send", () => {
    const data = checkoutSchema.parse({
      ...base,
      totalCentavos: 1,
      items: [{ ...base.items[0], unitPriceCentavos: 1 }],
    });
    expect(data).not.toHaveProperty("totalCentavos");
    expect(data.items[0]).not.toHaveProperty("unitPriceCentavos");
  });
});

describe("cart item checks", () => {
  it("accepts products and valid drinks", () => {
    expect(
      cartItemsSchema.safeParse([
        { id: "a", kind: "product", productSlug: "ensaymada", quantity: 2 },
        { id: "b", kind: "custom", config: latte, quantity: 1 },
      ]).success,
    ).toBe(true);
  });

  it("rejects repeats, bad quantities and bad drinks", () => {
    const item = {
      id: "a",
      kind: "product",
      productSlug: "ensaymada",
      quantity: 1,
    };
    expect(cartItemsSchema.safeParse([item, item]).success).toBe(false);
    expect(cartItemsSchema.safeParse([{ ...item, quantity: 21 }]).success).toBe(
      false,
    );
    expect(cartItemsSchema.safeParse([{ ...item, quantity: 0 }]).success).toBe(
      false,
    );
    expect(
      cartItemsSchema.safeParse([
        {
          id: "b",
          kind: "custom",
          config: { ...latte, sweetness: 33 },
          quantity: 1,
        },
      ]).success,
    ).toBe(false);
    expect(
      cartItemsSchema.safeParse(
        Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({
          ...item,
          id: `i${i}`,
        })),
      ).success,
    ).toBe(false);
  });

  it("keeps only the valid, unique items from the browser", () => {
    const good = {
      id: "a",
      kind: "product",
      productSlug: "ensaymada",
      quantity: 1,
    };
    expect(validCartItems("nope")).toEqual([]);
    expect(
      validCartItems([
        good,
        good,
        { ...good, id: "b", quantity: -1 },
        { id: "c" },
      ]),
    ).toEqual([good]);
    expect(
      validCartItems(
        Array.from({ length: MAX_CART_LINES + 5 }, (_, i) => ({
          ...good,
          id: `i${i}`,
        })),
      ),
    ).toHaveLength(MAX_CART_LINES);
  });
});

describe("payment", () => {
  it("offers cash only for delivery", () => {
    expect(paymentMethodsFor("pickup")).toEqual([
      "gcash_demo",
      "card_demo",
      "cash_pickup",
    ]);
    expect(paymentMethodsFor("delivery")).toEqual([
      "gcash_demo",
      "card_demo",
      "cod",
    ]);
  });

  it("keeps Cash at Pickup for pickup orders", () => {
    expect(
      errors({
        ...base,
        fulfillment: "delivery",
        street: "12 Lakeshore Drive",
        barangay: "Fort Bonifacio (BGC)",
        paymentMethod: "cash_pickup",
      }).paymentMethod,
    ).toMatch(/pickup/i);
    expect(paymentStatusFor("cash_pickup")).toBe("unpaid");
  });

  it("marks demo payments paid and cash unpaid", () => {
    expect(paymentStatusFor("gcash_demo")).toBe("demo_paid");
    expect(paymentStatusFor("card_demo")).toBe("demo_paid");
    expect(paymentStatusFor("cod")).toBe("unpaid");
  });
});
