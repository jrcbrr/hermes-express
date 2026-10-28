import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

/**
 * Neon branch id of the production database ("main"). E2E tests create and
 * change accounts, so they must never run against it. A branch id is not a
 * secret: it holds no credentials.
 */
export const PRODUCTION_NEON_BRANCH_ID = "br-jolly-water-az31b0ro";

/**
 * Runs once before all E2E tests. Refuses to start if DATABASE_URL (the same
 * value the app under test loads from .env.local) points at production.
 */
export default async function globalSetup() {
  loadEnvConfig(process.cwd());
  const url = process.env.DATABASE_URL;
  // No database: the database tests skip themselves (see e2e/auth.spec.ts).
  if (!url) return;

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run E2E tests with VERCEL_ENV=production.");
  }

  let branchId: string | null;
  try {
    const [row] = await neon(url)`
      select current_setting('neon.branch_id', true) as branch_id`;
    branchId = (row?.branch_id as string | null | undefined) ?? null;
  } catch {
    throw new Error(
      "E2E safety check could not reach the database in DATABASE_URL. Check .env.local.",
    );
  }

  if (branchId === PRODUCTION_NEON_BRANCH_ID) {
    throw new Error(
      [
        "Refusing to run E2E tests: DATABASE_URL points at the production database (Neon branch main).",
        "Use the Neon dev branch in .env.local instead (see docs/SETUP.md, Databases).",
      ].join("\n"),
    );
  }
}
