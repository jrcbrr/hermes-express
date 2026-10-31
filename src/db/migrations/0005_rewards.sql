CREATE TABLE "points_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" text,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" text PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"stars" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_stars_range" CHECK ("rating"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "saved_drink" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badge" (
	"user_id" text NOT NULL,
	"badge_key" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "user_badge_user_id_badge_key_pk" PRIMARY KEY("user_id","badge_key")
);
--> statement-breakpoint
CREATE TABLE "user_stat" (
	"user_id" text PRIMARY KEY NOT NULL,
	"custom_drinks_built" integer DEFAULT 0 NOT NULL,
	"bases_tried" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"milks_tried" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_drink" ADD CONSTRAINT "saved_drink_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stat" ADD CONSTRAINT "user_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "points_ledger_user_id_idx" ON "points_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "points_ledger_one_earn_per_order_uq" ON "points_ledger" USING btree ("order_id") WHERE "points_ledger"."reason" = 'earn';--> statement-breakpoint
CREATE UNIQUE INDEX "rating_item_user_uq" ON "rating" USING btree ("order_item_id","user_id");--> statement-breakpoint
CREATE INDEX "saved_drink_user_id_idx" ON "saved_drink" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_points_not_negative" CHECK ("user"."points_balance" >= 0);--> statement-breakpoint
-- Balances from before the ledger existed (Stage 7 adjustments): an opening row
-- keeps every balance equal to the sum of its ledger rows.
INSERT INTO "points_ledger" ("id", "user_id", "delta", "reason", "note")
SELECT gen_random_uuid()::text, "id", "points_balance", 'admin_adjust', 'Opening balance'
FROM "user"
WHERE "points_balance" <> 0;
