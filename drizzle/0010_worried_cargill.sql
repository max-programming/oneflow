ALTER TABLE "customer_invoices" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "customer_invoices" DROP COLUMN "paid_amount";--> statement-breakpoint
ALTER TABLE "vendor_bills" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "vendor_bills" DROP COLUMN "paid_amount";--> statement-breakpoint
DROP TYPE "public"."payment_status";