// Drizzle table definitions (see the data model in docs/PLAN.md §9).
// After changing this file, run `npm run db:generate` to create a migration in
// src/db/migrations. Migrations must stay additive.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { IngredientKind, ProductType, PromoType } from "@/lib/catalog";
import type { Role } from "@/lib/roles";
import type { DrinkConfig } from "@/lib/validation/drink";

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

// ---------------------------------------------------------------------------
// Catalog (Stage 3). Prices are integer centavos. Ingredients and products
// are seeded from src/db/catalog-data.ts.
// ---------------------------------------------------------------------------

/** Every builder option: sizes, temperatures, bases, milks, syrups, toppings, extra shot. */
export const ingredient = pgTable(
  "ingredient",
  {
    id: text("id").primaryKey(),
    kind: text("kind").$type<IngredientKind>().notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    priceCentavos: integer("price_centavos").notNull().default(0),
    /** Hex colour of the layer in the builder cup. Null for non-liquids. */
    color: text("color"),
    /** Bases only: shots included in the price. Null = takes no shots. */
    includedShots: integer("included_shots"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("ingredient_kind_idx").on(t.kind),
    check("ingredient_price_not_negative", sql`${t.priceCentavos} >= 0`),
  ],
);

/** Ready-made menu items: signature drinks, pastries and snacks. */
export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<ProductType>().notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    priceCentavos: integer("price_centavos").notNull(),
    imageUrl: text("image_url"),
    /** Signature drinks only: the drink as the builder would make it. */
    recipe: jsonb("recipe").$type<DrinkConfig>(),
    isSeasonal: boolean("is_seasonal").notNull().default(false),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableTo: timestamp("available_to", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("product_type_idx").on(t.type),
    check("product_price_not_negative", sql`${t.priceCentavos} >= 0`),
  ],
);

/**
 * Per-branch availability. Each row is about exactly one ingredient or one
 * product. No row means "in stock".
 */
export const branchStock = pgTable(
  "branch_stock",
  {
    id: text("id").primaryKey(),
    branchId: text("branch_id")
      .notNull()
      .references(() => branch.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id").references(() => ingredient.id, {
      onDelete: "cascade",
    }),
    productId: text("product_id").references(() => product.id, {
      onDelete: "cascade",
    }),
    isSoldOut: boolean("is_sold_out").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check(
      "branch_stock_one_item",
      sql`num_nonnulls(${t.ingredientId}, ${t.productId}) = 1`,
    ),
    uniqueIndex("branch_stock_branch_ingredient_uq").on(
      t.branchId,
      t.ingredientId,
    ),
    uniqueIndex("branch_stock_branch_product_uq").on(t.branchId, t.productId),
  ],
);

/** Discount codes. Applying them is Stage 8 (src/lib/promos.ts). */
export const promoCode = pgTable(
  "promo_code",
  {
    id: text("id").primaryKey(),
    /** Stored upper-case, e.g. "FIRSTSIP". */
    code: text("code").notNull().unique(),
    type: text("type").$type<PromoType>().notNull(),
    /** Percent (1–100) for "percent"; centavos for "fixed". */
    value: integer("value").notNull(),
    maxDiscountCentavos: integer("max_discount_centavos"),
    minSubtotalCentavos: integer("min_subtotal_centavos").notNull().default(0),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Null = unlimited. */
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [check("promo_code_value_positive", sql`${t.value} > 0`)],
);
