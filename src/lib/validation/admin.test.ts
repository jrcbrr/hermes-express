import { describe, expect, it } from "vitest";
import {
  customerFormSchema,
  ingredientFormSchema,
  pointsFormSchema,
  productFormSchema,
  roleFormSchema,
} from "./admin";

const product = {
  name: "Banana Bread",
  description: "",
  price: "85.50",
  isSeasonal: "",
  availableFrom: "",
  availableTo: "",
  isActive: "on",
};

const message = (result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => result.error?.issues[0]?.path[0];

describe("productFormSchema", () => {
  it("turns pesos into centavos and reads checkboxes", () => {
    expect(productFormSchema.parse(product)).toMatchObject({
      price: 8550,
      isSeasonal: false,
      isActive: true,
    });
  });

  it.each(["", "abc", "-5", "1.234", "1000000"])(
    "rejects price %j",
    (price) => {
      expect(message(productFormSchema.safeParse({ ...product, price }))).toBe(
        "price",
      );
    },
  );

  it("needs both dates when seasonal", () => {
    const result = productFormSchema.safeParse({
      ...product,
      isSeasonal: "on",
    });
    expect(result.error?.issues.map((i) => i.path[0])).toEqual([
      "availableFrom",
      "availableTo",
    ]);
  });

  it("rejects a last day before the first", () => {
    expect(
      message(
        productFormSchema.safeParse({
          ...product,
          isSeasonal: "on",
          availableFrom: "2026-12-31",
          availableTo: "2026-12-01",
        }),
      ),
    ).toBe("availableTo");
  });

  it("rejects a date that doesn't exist", () => {
    expect(
      message(
        productFormSchema.safeParse({
          ...product,
          availableFrom: "2026-02-31",
        }),
      ),
    ).toBe("availableFrom");
  });

  it("accepts a one-day season", () => {
    expect(
      productFormSchema.safeParse({
        ...product,
        isSeasonal: "on",
        availableFrom: "2026-12-25",
        availableTo: "2026-12-25",
      }).success,
    ).toBe(true);
  });
});

describe("ingredientFormSchema", () => {
  const valid = {
    id: "i1",
    name: "Oat",
    price: "30",
    color: "#aabbcc",
    sortOrder: "4",
    isActive: "on",
  };

  it("parses a valid option", () => {
    expect(ingredientFormSchema.parse(valid)).toMatchObject({
      price: 3000,
      color: "#AABBCC",
      sortOrder: 4,
      isActive: true,
    });
  });

  it("allows no colour", () => {
    expect(
      ingredientFormSchema.safeParse({ ...valid, color: "" }).success,
    ).toBe(true);
  });

  it("rejects bad values", () => {
    expect(
      message(ingredientFormSchema.safeParse({ ...valid, color: "red" })),
    ).toBe("color");
    expect(
      message(ingredientFormSchema.safeParse({ ...valid, sortOrder: "-1" })),
    ).toBe("sortOrder");
  });
});

describe("customerFormSchema", () => {
  const valid = { name: "Maria Santos", phone: "", defaultAddress: "" };

  it("allows no phone, for staff accounts", () => {
    expect(customerFormSchema.parse(valid).phone).toBeNull();
  });

  it("normalizes a phone", () => {
    expect(
      customerFormSchema.parse({ ...valid, phone: "0917 123 4567" }).phone,
    ).toBe("+639171234567");
  });

  it("rejects a bad phone", () => {
    expect(
      message(customerFormSchema.safeParse({ ...valid, phone: "12345" })),
    ).toBe("phone");
  });
});

describe("roleFormSchema", () => {
  it("needs a branch for baristas only", () => {
    expect(
      message(roleFormSchema.safeParse({ role: "barista", branchId: "" })),
    ).toBe("branchId");
    expect(
      roleFormSchema.safeParse({ role: "customer", branchId: "" }).success,
    ).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(
      message(roleFormSchema.safeParse({ role: "owner", branchId: "" })),
    ).toBe("role");
  });
});

describe("pointsFormSchema", () => {
  it.each([
    ["50", 50],
    ["+50", 50],
    ["-50", -50],
  ])("reads %j", (delta, expected) => {
    expect(pointsFormSchema.parse({ delta, note: "Goodwill" }).delta).toBe(
      expected,
    );
  });

  it.each(["0", "1.5", "abc", "", "1000000"])("rejects %j", (delta) => {
    expect(
      message(pointsFormSchema.safeParse({ delta, note: "Goodwill" })),
    ).toBe("delta");
  });

  it("needs a reason", () => {
    expect(
      message(pointsFormSchema.safeParse({ delta: "5", note: "  " })),
    ).toBe("note");
  });
});
