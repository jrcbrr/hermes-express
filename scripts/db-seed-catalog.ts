// Seeds the menu (no secrets needed). Runs in the Vercel build after
// migrations, and as part of `npm run db:seed`. Only adds missing rows.
// Skips (exit 0) when no database is configured, like scripts/db-migrate.ts.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set, skipping the catalog seed.");
    return;
  }
  // Imported after loading env so DATABASE_URL is set.
  const { getDb } = await import("@/db");
  const { seedCatalog } = await import("@/db/seed-catalog");
  console.log("Seeding the catalog (only missing rows)…");
  await seedCatalog(getDb());
  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
