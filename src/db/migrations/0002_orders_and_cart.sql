CREATE TABLE "cart" (
	"user_id" text PRIMARY KEY NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"fulfillment" text NOT NULL,
	"status" text NOT NULL,
	"scheduled_for" timestamp with time zone,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"receipt_email" text NOT NULL,
	"address" text,
	"notes" text DEFAULT '' NOT NULL,
	"subtotal_centavos" integer NOT NULL,
	"discount_centavos" integer DEFAULT 0 NOT NULL,
	"delivery_fee_centavos" integer NOT NULL,
	"points_redeemed" integer DEFAULT 0 NOT NULL,
	"total_centavos" integer NOT NULL,
	"promo_code_id" text,
	"payment_method" text NOT NULL,
	"payment_status" text NOT NULL,
	"client_request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_code_unique" UNIQUE("code"),
	CONSTRAINT "order_client_request_id_unique" UNIQUE("client_request_id"),
	CONSTRAINT "order_amounts_not_negative" CHECK ("order"."subtotal_centavos" >= 0 and "order"."discount_centavos" >= 0 and "order"."delivery_fee_centavos" >= 0 and "order"."total_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"kind" text NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"unit_price_centavos" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_centavos" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_item_quantity_positive" CHECK ("order_item"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_event" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"status" text NOT NULL,
	"changed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_promo_code_id_promo_code_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_code"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_event" ADD CONSTRAINT "order_status_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_event" ADD CONSTRAINT "order_status_event_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_user_id_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_branch_status_idx" ON "order" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "order_item_order_id_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_event_order_id_idx" ON "order_status_event" USING btree ("order_id");