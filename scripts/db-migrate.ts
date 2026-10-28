// Applies pending migrations from src/db/migrations.
// Skips (exit 0) when no database is configured, so a fresh clone and CI can
// run every npm script without a database.
import { execSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set, skipping migrations.");
  process.exit(0);
}

execSync("npx drizzle-kit migrate", { stdio: "inherit" });
