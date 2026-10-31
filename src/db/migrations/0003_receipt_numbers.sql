ALTER TABLE "branch" ADD COLUMN "receipt_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Added without NOT NULL first, so orders placed before this migration can be numbered.
ALTER TABLE "order" ADD COLUMN "receipt_number" integer;--> statement-breakpoint
-- Number existing orders 1, 2, 3... per branch, oldest first.
UPDATE "order" AS o
SET "receipt_number" = numbered.n
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "branch_id" ORDER BY "created_at", "id") AS n
	FROM "order"
) AS numbered
WHERE o."id" = numbered."id";--> statement-breakpoint
-- Each branch's counter continues from its last numbered order.
UPDATE "branch" AS b
SET "receipt_seq" = counts.last_number
FROM (
	SELECT "branch_id", max("receipt_number") AS last_number
	FROM "order"
	GROUP BY "branch_id"
) AS counts
WHERE b."id" = counts."branch_id";--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "receipt_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "order_branch_receipt_number_uq" ON "order" USING btree ("branch_id","receipt_number");
