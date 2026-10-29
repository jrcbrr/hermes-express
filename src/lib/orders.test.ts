import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";
import { priceCartItems, type CartItem, type PricedCartItem } from "./cart";
import {
  draftOrder,
  generateOrderCode,
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
} from "./orders";

const latteItem: CartItem = {
  id: "b",
  kind: "custom",
  config: {
    size: "16oz",
    temperature: "iced",
    iceLevel: "regular",
    base: "latte",
    milk: "oat",
    milkAmount: "regular",
    sweetness: 50,
    syrups: ["vanilla"],
    toppings: [],
  },
  quantity: 2,
};
const croissant: CartItem = {
  id: "a",
  kind: "product",
  productSlug: "butter-croissant",
  quantity: 1,
};

const priced = (items: CartItem[]) =>
  priceCartItems(items, seedSnapshot(), "bgc", FIXTURE_NOW);

describe("draftOrder", () => {
  it("snapshots every line and totals the order", () => {
    const draft = draftOrder(priced([croissant, latteItem]), "pickup");
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.lines[0]).toEqual({
      kind: "product",
      productSlug: "butter-croissant",
      name: "Butter Croissant",
      config: { productSlug: "butter-croissant", details: [] },
      unitPriceCentavos: 9500,
      quantity: 1,
      lineTotalCentavos: 9500,
    });
    // Latte ₱130 + 16oz ₱20 + oat ₱30 + vanilla ₱20 = ₱200.
    expect(draft.lines[1]).toMatchObject({
      kind: "custom",
      productSlug: null,
      name: "Custom Latte",
      unitPriceCentavos: 20000,
      quantity: 2,
      lineTotalCentavos: 40000,
      config: { drink: latteItem.config },
    });
    expect(draft.totals).toEqual({
      itemCount: 3,
      subtotalCentavos: 49500,
      discountCentavos: 0,
      deliveryFeeCentavos: 0,
      totalCentavos: 49500,
    });
  });

  it("keeps the signature slug of a customized signature", () => {
    const recipe = seedSnapshot().products.find(
      (p) => p.slug === "golden-sandal",
    )!.recipe!;
    const draft = draftOrder(
      priced([
        {
          id: "s",
          kind: "custom",
          config: { ...recipe, signature: "golden-sandal" },
          quantity: 1,
        },
      ]),
      "pickup",
    );
    expect(draft.ok && draft.lines[0]!.productSlug).toBe("golden-sandal");
  });

  it("adds the delivery fee below ₱800 and waives it from ₱800", () => {
    const below = draftOrder(priced([latteItem]), "delivery");
    expect(below.ok && below.totals).toMatchObject({
      deliveryFeeCentavos: 4900,
      totalCentavos: 44900,
    });
    const at800 = draftOrder(
      priced([{ ...latteItem, quantity: 4 }]),
      "delivery",
    );
    expect(at800.ok && at800.totals).toMatchObject({
      subtotalCentavos: 80000,
      deliveryFeeCentavos: 0,
      totalCentavos: 80000,
    });
  });

  it("applies a discount (the Stage 8 extension point)", () => {
    const draft = draftOrder(priced([latteItem]), "pickup", 5000);
    expect(draft.ok && draft.totals.totalCentavos).toBe(35000);
  });

  it("refuses the whole order when any item has a problem", () => {
    const draft = draftOrder(
      priced([croissant, { ...croissant, id: "z", productSlug: "gone" }]),
      "pickup",
    );
    expect(draft).toEqual({
      ok: false,
      problems: [
        {
          itemId: "z",
          name: "Item no longer on the menu",
          problem: "This item is no longer on the menu. Please remove it.",
        },
      ],
    });
  });

  it("explains an unpriced item without a problem message", () => {
    const odd: PricedCartItem = {
      item: croissant,
      name: "Odd",
      details: [],
      unitPriceCentavos: null,
      lineTotalCentavos: null,
      problem: null,
    };
    const draft = draftOrder([odd], "pickup");
    expect(!draft.ok && draft.problems[0]!.problem).toMatch(
      /cannot be ordered/,
    );
  });

  it("refuses an empty cart", () => {
    expect(draftOrder([], "pickup")).toEqual({
      ok: false,
      problems: [{ itemId: "", name: "", problem: "Your cart is empty." }],
    });
  });
});

describe("generateOrderCode", () => {
  it("makes HX- plus four easy-to-read characters", () => {
    const picks = [0, 1, 2, ORDER_CODE_ALPHABET.length - 1];
    let i = 0;
    expect(generateOrderCode(() => picks[i++]!)).toBe("HX-234Z");
  });

  it("only uses unambiguous characters", () => {
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01OILUV]/);
    const code = generateOrderCode((max) => Math.floor(Math.random() * max));
    expect(code).toMatch(
      new RegExp(`^HX-[${ORDER_CODE_ALPHABET}]{${ORDER_CODE_LENGTH}}$`),
    );
  });
});
