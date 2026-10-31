// Seeds branches, the menu (src/db/seed-catalog.ts) and staff accounts.
// Safe to run again: existing branches and staff are updated in place and
// existing passwords are never overwritten, unless you
// pass --reset-passwords (npm run db:seed -- --reset-passwords), which sets
// staff passwords from .env.local and signs those accounts out. Menu rows
// that already exist are never changed.
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

loadEnvConfig(process.cwd());

async function main() {
  // Imported after loading env so DATABASE_URL is set.
  const { siteConfig } = await import("@/config/site");
  const { getDb } = await import("./index");
  const { account, branch, session, user } = await import("./schema");
  const { parseSeedArgs, readStaffSeeds } = await import("./seed-env");
  const { seedCatalog } = await import("./seed-catalog");

  // Check the arguments and every variable before touching the database.
  const options = parseSeedArgs(process.argv.slice(2));
  const staff = readStaffSeeds();
  const db = getDb();

  console.log("Seeding branches…");
  const branchIds = new Map<string, string>();
  for (const b of siteConfig.branches) {
    const [row] = await db
      .insert(branch)
      .values({
        id: randomUUID(),
        slug: b.slug,
        name: b.name,
        address: b.address,
        opensAt: b.opensAt,
        closesAt: b.closesAt,
      })
      .onConflictDoUpdate({
        target: branch.slug,
        set: {
          name: b.name,
          address: b.address,
          opensAt: b.opensAt,
          closesAt: b.closesAt,
        },
      })
      .returning({ id: branch.id });
    if (!row) throw new Error(`Could not save branch ${b.slug}.`);
    branchIds.set(b.slug, row.id);
    console.log(`  ✓ ${b.name}`);
  }

  console.log("Seeding the catalog (only missing rows)…");
  await seedCatalog(db);

  console.log("Seeding staff accounts…");
  for (const member of staff) {
    const branchId = member.branchSlug
      ? (branchIds.get(member.branchSlug) ?? null)
      : null;
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, member.email));

    const userId = existing?.id ?? randomUUID();
    if (existing) {
      await db
        .update(user)
        .set({ role: member.role, branchId })
        .where(eq(user.id, userId));
    } else {
      await db.insert(user).values({
        id: userId,
        name: member.name,
        email: member.email,
        emailVerified: true,
        role: member.role,
        branchId,
      });
    }

    // Better Auth keeps the password hash (scrypt) on a "credential" account
    // row. The Neon HTTP driver has no transactions, so this is also where a
    // half-finished earlier run gets repaired.
    const [credential] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, userId), eq(account.providerId, "credential")),
      );
    if (credential && options.resetPasswords) {
      await db
        .update(account)
        .set({ password: await hashPassword(member.password) })
        .where(eq(account.id, credential.id));
      // Old sessions might belong to someone who knew the old password.
      await db.delete(session).where(eq(session.userId, userId));
      console.log(
        `  ✓ ${member.email} (${member.role}) password reset, signed out everywhere`,
      );
      continue;
    }
    if (credential) {
      console.log(
        `  ✓ ${member.email} (${member.role}) already exists, role updated`,
      );
      continue;
    }
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(member.password),
    });
    console.log(`  ✓ ${member.email} (${member.role}) created`);
  }

  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
