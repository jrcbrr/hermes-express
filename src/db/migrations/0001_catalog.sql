CREATE TABLE "branch_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"ingredient_id" text,
	"product_id" text,
	"is_sold_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_stock_one_item" CHECK (num_nonnulls("branch_stock"."ingredient_id", "branch_stock"."product_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"price_centavos" integer DEFAULT 0 NOT NULL,
	"color" text,
	"included_shots" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_slug_unique" UNIQUE("slug"),
	CONSTRAINT "ingredient_price_not_negative" CHECK ("ingredient"."price_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_centavos" integer NOT NULL,
	"image_url" text,
	"recipe" jsonb,
	"is_seasonal" boolean DEFAULT false NOT NULL,
	"available_from" timestamp with time zone,
	"available_to" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_price_not_negative" CHECK ("product"."price_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promo_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"max_discount_centavos" integer,
	"min_subtotal_centavos" integer DEFAULT 0 NOT NULL,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_code_code_unique" UNIQUE("code"),
	CONSTRAINT "promo_code_value_positive" CHECK ("promo_code"."value" > 0)
);
--> statement-breakpoint
ALTER TABLE "branch_stock" ADD CONSTRAINT "branch_stock_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stock" ADD CONSTRAINT "branch_stock_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_stock" ADD CONSTRAINT "branch_stock_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_stock_branch_ingredient_uq" ON "branch_stock" USING btree ("branch_id","ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_stock_branch_product_uq" ON "branch_stock" USING btree ("branch_id","product_id");--> statement-breakpoint
CREATE INDEX "ingredient_kind_idx" ON "ingredient" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "product_type_idx" ON "product" USING btree ("type");