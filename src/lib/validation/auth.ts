import { z } from "zod";

/**
 * Accepts the common ways Filipinos write a mobile number
 * (0917 123 4567, 0917-123-4567, +63 917 123 4567, 639171234567)
 * and returns the canonical +639XXXXXXXXX form, or null if it isn't one.
 */
export function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:\+?63|0)(9\d{9})$/.exec(digits);
  return match ? `+63${match[1]}` : null;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const name = z
  .string()
  .trim()
  .min(2, "Please enter your name (at least 2 characters).")
  .max(80, "Please keep your name under 80 characters.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address."));

const phone = z
  .string()
  .trim()
  .transform((value, ctx) => {
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
  });

const password = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Please use a password of at least ${PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Please use a password of at most ${PASSWORD_MAX_LENGTH} characters.`,
  );

export const signUpSchema = z
  .object({
    name,
    email,
    phone,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match. Please try again.",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
});
export type LogInInput = z.infer<typeof logInSchema>;

export const profileSchema = z.object({
  name,
  phone,
  defaultAddress: z
    .string()
    .trim()
    .max(300, "Please keep the address under 300 characters.")
    .transform((value) => (value === "" ? null : value)),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Field name → first error message, ready for a form to show. */
export type FieldErrors = Partial<Record<string, string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
