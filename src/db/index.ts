import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb(url: string) {
  // The Neon HTTP driver sends each query over HTTPS, which suits serverless functions.
  return drizzle(neon(url), { schema });
}

export type Database = ReturnType<typeof createDb>;

let db: Database | undefined;

/**
 * Returns the shared Drizzle client. It connects lazily, so importing this
 * module (for example during `next build`) never requires DATABASE_URL.
 */
export function getDb(): Database {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local or run `npx vercel env pull .env.local`.",
      );
    }
    db = createDb(url);
  }
  return db;
}
