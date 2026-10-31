import { siteConfig } from "@/config/site";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

/** Which environment variable holds each branch barista's password. */
export const BARISTA_PASSWORD_VARS: Record<string, string> = {
  tipas: "SEED_BARISTA_TIPAS_PASSWORD",
  bgc: "SEED_BARISTA_BGC_PASSWORD",
  "taguig-lakeshore": "SEED_BARISTA_LAKESHORE_PASSWORD",
};

export type StaffSeed = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "barista" | "customer";
  /** Branch slug, baristas only. */
  branchSlug: string | null;
};

export function baristaEmail(branchSlug: string): string {
  return `barista.${branchSlug}@hermes-express.test`;
}

/**
 * Reads and checks every staff account the seed needs. Throws one error that
 * lists every missing or too-short variable, so they can all be fixed at once.
 */
export function readStaffSeeds(
  env: Partial<Record<string, string>> = process.env,
): StaffSeed[] {
  const problems: string[] = [];

  function password(varName: string): string {
    const value = env[varName] ?? "";
    if (!value) problems.push(`${varName} is missing.`);
    else if (value.length < PASSWORD_MIN_LENGTH) {
      problems.push(
        `${varName} must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
    }
    return value;
  }

  const adminEmail = (env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!adminEmail) problems.push("SEED_ADMIN_EMAIL is missing.");

  const staff: StaffSeed[] = [
    {
      name: "Hermes Admin",
      email: adminEmail,
      password: password("SEED_ADMIN_PASSWORD"),
      role: "admin",
      branchSlug: null,
    },
  ];

  for (const branch of siteConfig.branches) {
    const varName = BARISTA_PASSWORD_VARS[branch.slug];
    if (!varName) {
      problems.push(
        `No barista password variable is defined for branch "${branch.slug}".`,
      );
      continue;
    }
    staff.push({
      name: `${branch.name} Barista`,
      email: baristaEmail(branch.slug),
      password: password(varName),
      role: "barista",
      branchSlug: branch.slug,
    });
  }

  if (problems.length > 0) {
    throw new Error(
      `Cannot seed staff accounts. Fix these in .env.local:\n- ${problems.join("\n- ")}`,
    );
  }
  return staff;
}

export const DEMO_CUSTOMER_EMAIL = "demo.customer@hermes-express.test";

/**
 * The demo customer for hackathon judges. Optional, so a database without demo
 * accounts can still be seeded: no variable, no account.
 */
export function readDemoCustomerSeed(
  env: Partial<Record<string, string>> = process.env,
): StaffSeed | null {
  const password = env.SEED_DEMO_CUSTOMER_PASSWORD ?? "";
  if (!password) return null;
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `SEED_DEMO_CUSTOMER_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  return {
    name: "Demo Customer",
    email: DEMO_CUSTOMER_EMAIL,
    password,
    role: "customer",
    branchSlug: null,
  };
}

export type SeedOptions = {
  /** Overwrite existing staff passwords with the values in .env.local. */
  resetPasswords: boolean;
};

/** Reads the seed's command-line flags. Unknown flags are an error, not ignored. */
export function parseSeedArgs(args: readonly string[]): SeedOptions {
  const options: SeedOptions = { resetPasswords: false };
  for (const arg of args) {
    if (arg === "--reset-passwords") options.resetPasswords = true;
    else {
      throw new Error(
        `Unknown seed option "${arg}". The only option is --reset-passwords.`,
      );
    }
  }
  return options;
}
