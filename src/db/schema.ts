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
import type { BranchService } from "@/config/site";
import type { CartItem } from "@/lib/cart";
import type { IngredientKind, ProductType, PromoType } from "@/lib/catalog";
import type { OrderStatus } from "@/lib/order-status";
import type { OrderItemConfig, OrderItemKind } from "@/lib/orders";
import type { PaymentMethod, PaymentStatus } from "@/lib/validation/checkout";
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

// ---------------------------------------------------------------------------
// Cart and orders (Stage 5). Order prices are snapshots: they are copied at
// order time, so later menu changes never alter an old order.
// ---------------------------------------------------------------------------

/** A signed-in customer's saved cart: what they chose, never prices. */
export const cart = pgTable("cart", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  items: jsonb("items").$type<CartItem[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const order = pgTable(
  "order",
  {
    id: text("id").primaryKey(),
    /** Short code shown to the customer, e.g. "HX-7K2P". */
    code: text("code").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branch.id, { onDelete: "restrict" }),
    fulfillment: text("fulfillment").$type<BranchService>().notNull(),
    status: text("status").$type<OrderStatus>().notNull(),
    /** Null means ASAP. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    contactName: text("contact_name").notNull(),
    /** +639XXXXXXXXX. */
    phone: text("phone").notNull(),
    /** Where the receipt is emailed. */
    receiptEmail: text("receipt_email").notNull(),
    /** Delivery only. */
    address: text("address"),
    notes: text("notes").notNull().default(""),
    subtotalCentavos: integer("subtotal_centavos").notNull(),
    discountCentavos: integer("discount_centavos").notNull().default(0),
    deliveryFeeCentavos: integer("delivery_fee_centavos").notNull(),
    pointsRedeemed: integer("points_redeemed").notNull().default(0),
    totalCentavos: integer("total_centavos").notNull(),
    /** Stage 8 (promo codes). */
    promoCodeId: text("promo_code_id").references(() => promoCode.id, {
      onDelete: "set null",
    }),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    paymentStatus: text("payment_status").$type<PaymentStatus>().notNull(),
    /** Sent by the browser once per checkout, so a double tap orders once. */
    clientRequestId: text("client_request_id").notNull().unique(),
    ...timestamps,
  },
  (t) => [
    index("order_user_id_idx").on(t.userId),
    index("order_branch_status_idx").on(t.branchId, t.status),
    check(
      "order_amounts_not_negative",
      sql`${t.subtotalCentavos} >= 0 and ${t.discountCentavos} >= 0 and ${t.deliveryFeeCentavos} >= 0 and ${t.totalCentavos} >= 0`,
    ),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    kind: text("kind").$type<OrderItemKind>().notNull(),
    productId: text("product_id").references(() => product.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    config: jsonb("config").$type<OrderItemConfig>().notNull(),
    unitPriceCentavos: integer("unit_price_centavos").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCentavos: integer("line_total_centavos").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("order_item_order_id_idx").on(t.orderId),
    check("order_item_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

/** Every status an order has had, oldest first: the tracker's history. */
export const orderStatusEvent = pgTable(
  "order_status_event",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    status: text("status").$type<OrderStatus>().notNull(),
    changedByUserId: text("changed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_status_event_order_id_idx").on(t.orderId)],
);
