import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { consume } from "@/server/rate-limit";
import {
  normalizePhPhone,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./validation/auth";

type Env = Partial<Record<string, string>>;

/**
 * The app's public URL. Production sets BETTER_AUTH_URL; Vercel previews fall
 * back to the deployment URL Vercel provides; local dev uses localhost.
 */
export function resolveBaseURL(env: Env = process.env): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Origins allowed to call /api/auth: the base URL plus Vercel's preview aliases. */
export function resolveTrustedOrigins(env: Env = process.env): string[] {
  const origins = new Set([resolveBaseURL(env)]);
  if (env.VERCEL_URL) origins.add(`https://${env.VERCEL_URL}`);
  if (env.VERCEL_BRANCH_URL) origins.add(`https://${env.VERCEL_BRANCH_URL}`);
  return [...origins];
}

// Stored phone numbers must already be in +639XXXXXXXXX form. This guards the
// raw /api/auth endpoints; our server actions normalize before calling.
const storedPhone = z
  .string()
  .refine(
    (value) => normalizePhPhone(value) === value,
    "Invalid phone number.",
  );

function createAuth() {
  return betterAuth({
    appName: siteConfig.name,
    baseURL: resolveBaseURL(),
    trustedOrigins: resolveTrustedOrigins(),
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      // Sign the user in right after signing up.
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
          validator: { input: storedPhone },
        },
        // Everything below is server-controlled: `input: false` stops a user
        // from setting it when they sign up.
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          input: false,
        },
        branchId: { type: "string", required: false, input: false },
        pointsBalance: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        defaultAddress: { type: "string", required: false, input: false },
      },
    },
    rateLimit: {
      // On in every environment (Better Auth's default is production only),
      // stored in Postgres so the limit holds across serverless instances.
      enabled: true,
      customStorage: { consume: (key, rule) => consume(`ba:${key}`, rule) },
    },
    // nextCookies must be the last plugin: it lets server actions set cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
export type SessionUser = AuthSession["user"];

let auth: Auth | undefined;

/** The shared Better Auth instance, created on first use (never at build time). */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
