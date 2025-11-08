ALTER TABLE "purchase_orders" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sales_orders" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."purchase_order_status";--> statement-breakpoint
DROP TYPE "public"."sales_order_status";