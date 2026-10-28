"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { safeNextPath } from "@/lib/roles";
import {
  logInSchema,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/auth";
import {
  AUTH_EMAIL_RATE_LIMIT,
  AUTH_IP_RATE_LIMIT,
  consume,
  type RateLimitRule,
} from "@/server/rate-limit";
import { clientIp, formString } from "./request";

export type AuthFormState = {
  /** A message for the whole form (shown above the fields). */
  message?: string;
  errors?: FieldErrors;
  /** Non-secret values to put back in the form after an error. */
  values?: Record<string, string>;
};

const TOO_MANY_ATTEMPTS =
  "Too many attempts. Please wait a minute and try again.";
const SOMETHING_WENT_WRONG =
  "We could not complete your request. Please try again in a moment.";

/**
 * Better Auth's error code (e.g. "INVALID_EMAIL_OR_PASSWORD"), "UNKNOWN" for
 * an auth error without one, or null for any other error (those are real
 * bugs and should surface, not be hidden behind a friendly message).
 */
function errorCode(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  const body: unknown = error.body;
  if (body && typeof body === "object" && "code" in body) {
    return String(body.code);
  }
  return "UNKNOWN";
}

/** Counts one attempt per IP and per email; blocked if either is over its limit. */
async function isRateLimited(
  action: "signup" | "login",
  ip: string,
  email: string,
): Promise<boolean> {
  const checks: [string, RateLimitRule][] = [
    [`${action}:ip:${ip}`, AUTH_IP_RATE_LIMIT],
    [`${action}:email:${email}`, AUTH_EMAIL_RATE_LIMIT],
  ];
  const results = await Promise.all(
    checks.map(([key, rule]) => consume(key, rule)),
  );
  return results.some((result) => !result.allowed);
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  const { name, email, phone, password } = parsed.data;
  const requestHeaders = await headers();
  if (await isRateLimited("signup", clientIp(requestHeaders), email)) {
    return { message: TOO_MANY_ATTEMPTS, values };
  }

  try {
    await getAuth().api.signUpEmail({
      body: { name, email, phone, password },
      headers: requestHeaders,
    });
  } catch (error) {
    const code = errorCode(error);
    if (code?.startsWith("USER_ALREADY_EXISTS")) {
      return {
        errors: {
          email:
            "An account with this email already exists. Please log in instead.",
        },
        values,
      };
    }
    if (!code) throw error;
    return { message: SOMETHING_WENT_WRONG, values };
  }

  redirect(safeNextPath(formString(formData, "next")));
}

export async function logIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: formString(formData, "email") };
  const parsed = logInSchema.safeParse({
    ...values,
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values };
  }

  const { email, password } = parsed.data;
  const requestHeaders = await headers();
  if (await isRateLimited("login", clientIp(requestHeaders), email)) {
    return { message: TOO_MANY_ATTEMPTS, values };
  }

  try {
    await getAuth().api.signInEmail({
      body: { email, password },
      headers: requestHeaders,
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "INVALID_EMAIL_OR_PASSWORD") {
      return {
        message: "The email or password you entered is incorrect.",
        values,
      };
    }
    if (!code) throw error;
    return { message: SOMETHING_WENT_WRONG, values };
  }

  redirect(safeNextPath(formString(formData, "next")));
}

export async function logOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
