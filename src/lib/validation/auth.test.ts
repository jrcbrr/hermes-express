import { describe, expect, it } from "vitest";
import {
  logInSchema,
  normalizePhPhone,
  profileSchema,
  signUpSchema,
  toFieldErrors,
} from "./auth";

describe("normalizePhPhone", () => {
  it.each([
    ["09171234567", "+639171234567"],
    ["0917 123 4567", "+639171234567"],
    ["0917-123-4567", "+639171234567"],
    ["+63 917 123 4567", "+639171234567"],
    ["639171234567", "+639171234567"],
    ["(0917) 123.4567", "+639171234567"],
  ])("accepts %s", (input, expected) => {
    expect(normalizePhPhone(input)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "0817 123 4567",
    "0917 123 456",
    "0917 123 45678",
    "+1 917 123 4567",
    "0917abc4567",
  ])("rejects %s", (input) => {
    expect(normalizePhPhone(input)).toBeNull();
  });
});

const validSignUp = {
  name: "  Maria Santos ",
  email: " Maria@Example.COM ",
  phone: "0917 123 4567",
  password: "brewed-by-you",
  confirmPassword: "brewed-by-you",
};

describe("signUpSchema", () => {
  it("trims, lowercases the email and normalizes the phone", () => {
    const result = signUpSchema.parse(validSignUp);
    expect(result).toMatchObject({
      name: "Maria Santos",
      email: "maria@example.com",
      phone: "+639171234567",
    });
  });

  it("gives a friendly message for each problem", () => {
    const result = signUpSchema.safeParse({
      name: "M",
      email: "not-an-email",
      phone: "12345",
      password: "short",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.name).toMatch(/at least 2 characters/);
    expect(errors.email).toBe("Please enter a valid email address.");
    expect(errors.phone).toMatch(/valid Philippine mobile number/);
    expect(errors.password).toMatch(/at least 8 characters/);
  });

  it("rejects passwords that don't match", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      confirmPassword: "nope-nope",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toFieldErrors(result.error).confirmPassword).toMatch(/do not match/);
  });

  it("rejects very long names and passwords", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      name: "x".repeat(81),
      password: "p".repeat(129),
      confirmPassword: "p".repeat(129),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.name).toMatch(/under 80/);
    expect(errors.password).toMatch(/at most 128/);
  });
});

describe("logInSchema", () => {
  it("needs an email and a password", () => {
    const result = logInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toFieldErrors(result.error);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBe("Please enter your password.");
  });

  it("accepts any non-empty password (length rules apply at sign-up)", () => {
    expect(logInSchema.parse({ email: "a@b.co", password: "x" })).toEqual({
      email: "a@b.co",
      password: "x",
    });
  });
});

describe("profileSchema", () => {
  it("stores an empty address as null", () => {
    const result = profileSchema.parse({
      name: "Maria",
      phone: "09171234567",
      defaultAddress: "   ",
    });
    expect(result).toEqual({
      name: "Maria",
      phone: "+639171234567",
      defaultAddress: null,
    });
  });

  it("limits the address length", () => {
    const result = profileSchema.safeParse({
      name: "Maria",
      phone: "09171234567",
      defaultAddress: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe("toFieldErrors", () => {
  it("keeps the first message per field and uses 'form' for root issues", () => {
    const result = logInSchema.safeParse("nope");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(toFieldErrors(result.error))).toEqual(["form"]);
  });
});
