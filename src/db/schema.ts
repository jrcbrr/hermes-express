// Drizzle table definitions (see the data model in docs/PLAN.md §9).
// After changing this file, run `npm run db:generate` to create a migration in
// src/db/migrations. Migrations must stay additive.
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { Role } from "@/lib/roles";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** A Hermes Express shop. Seeded from `siteConfig.branches`. */
export const branch = pgTable("branch", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  /** 24-hour "HH:MM", Manila time. */
  opensAt: text("opens_at").notNull(),
  closesAt: text("closes_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Better Auth tables. Column names follow Better Auth's expected field names;
// the extra user fields are declared in src/lib/auth.ts as `additionalFields`.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Philippine mobile number in +639XXXXXXXXX form. */
  phone: text("phone"),
  role: text("role").$type<Role>().notNull().default("customer"),
  /** Only set for baristas: the branch whose queue they work. */
  branchId: text("branch_id").references(() => branch.id, {
    onDelete: "set null",
  }),
  pointsBalance: integer("points_balance").notNull().default(0),
  defaultAddress: text("default_address"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /** Password hash (Better Auth uses scrypt). Never the plain password. */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Fixed-window counters for rate limiting (src/server/rate-limit.ts). */
export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  /** Window start, in milliseconds since the epoch. */
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});
