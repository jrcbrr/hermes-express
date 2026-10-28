import { describe, expect, it } from "vitest";
import {
  DRINK_NAME_MAX_LENGTH,
  drinkConfigSchema,
  type DrinkConfig,
} from "./drink";

const latte: DrinkConfig = {
  size: "12oz",
  temperature: "hot",
  base: "latte",
  shots: 1,
  milk: "whole",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
};

function parse(overrides: Record<string, unknown>) {
  return drinkConfigSchema.safeParse({ ...latte, ...overrides });
}

function firstMessage(overrides: Record<string, unknown>): string {
  const result = parse(overrides);
  if (result.success) throw new Error("Expected the config to be invalid");
  return result.error.issues[0]?.message ?? "";
}

describe("drinkConfigSchema", () => {
  it("accepts a simple drink", () => {
    expect(drinkConfigSchema.parse(latte)).toEqual(latte);
  });

  it("accepts a fully loaded iced drink with a name and signature", () => {
    const result = parse({
      size: "22oz",
      temperature: "iced",
      iceLevel: "extra",
      shots: 4,
      milk: "oat",
      milkAmount: "light",
      sweetness: 100,
      syrups: ["vanilla", "caramel", "honey"],
      toppings: [
        "whipped-cream",
        "cold-foam",
        "caramel-drizzle",
        "cookie-crumble",
        "cinnamon-dust",
      ],
      name: "  Monday Fuel  ",
      signature: "olympus-latte",
    });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Monday Fuel");
  });

  it("allows shots to be left out", () => {
    const { shots: _shots, ...withoutShots } = latte;
    expect(drinkConfigSchema.safeParse(withoutShots).success).toBe(true);
  });

  it.each(["8oz", "", 12])("rejects size %s", (size) => {
    expect(parse({ size }).success).toBe(false);
  });

  it.each(["warm", "frozen"])("rejects temperature %s", (temperature) => {
    expect(parse({ temperature }).success).toBe(false);
  });

  it("only allows an ice level on iced drinks", () => {
    expect(firstMessage({ iceLevel: "light" })).toBe(
      "Ice level is only for iced drinks.",
    );
    expect(
      parse({ temperature: "blended", iceLevel: "regular" }).success,
    ).toBe(false);
    expect(parse({ temperature: "iced", iceLevel: "regular" }).success).toBe(
      true,
    );
  });

  it.each([0, 5, 1.5, -1])("rejects %s shots", (shots) => {
    expect(parse({ shots }).success).toBe(false);
  });

  it.each([10, 30, 101, "50"])("rejects sweetness %s", (sweetness) => {
    expect(parse({ sweetness }).success).toBe(false);
  });

  it.each([0, 25, 50, 75, 100])("accepts sweetness %s", (sweetness) => {
    expect(parse({ sweetness }).success).toBe(true);
  });

  it("rejects an unknown milk amount", () => {
    expect(parse({ milkAmount: "double" }).success).toBe(false);
  });

  it.each(["Latte", "oat milk", "../etc", "", "-oat", "oat-"])(
    "rejects the badly formed slug %j",
    (base) => {
      expect(firstMessage({ base })).toBe("Please choose a valid option.");
    },
  );

  it("allows at most 3 syrups", () => {
    expect(
      firstMessage({
        syrups: ["vanilla", "caramel", "honey", "toffee"],
      }),
    ).toBe("Please choose at most 3 syrups.");
  });

  it("does not allow the same syrup twice", () => {
    expect(firstMessage({ syrups: ["vanilla", "vanilla"] })).toBe(
      "Each syrup can only be added once.",
    );
  });

  it("allows at most 5 toppings", () => {
    expect(
      firstMessage({
        toppings: ["a", "b", "c", "d", "e", "f"],
      }),
    ).toBe("Please choose at most 5 toppings.");
  });

  it("does not allow the same topping twice", () => {
    expect(firstMessage({ toppings: ["cold-foam", "cold-foam"] })).toBe(
      "Each topping can only be added once.",
    );
  });

  it("rejects an empty or overly long name", () => {
    expect(firstMessage({ name: "   " })).toBe(
      "Please enter a name, or leave it empty.",
    );
    expect(firstMessage({ name: "x".repeat(DRINK_NAME_MAX_LENGTH + 1) })).toBe(
      `Please keep the name under ${DRINK_NAME_MAX_LENGTH} characters.`,
    );
  });

  it("rejects unknown fields, such as a price sent by the client", () => {
    expect(parse({ priceCentavos: 1 }).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { base: _base, ...withoutBase } = latte;
    expect(drinkConfigSchema.safeParse(withoutBase).success).toBe(false);
    expect(drinkConfigSchema.safeParse(null).success).toBe(false);
  });
});
