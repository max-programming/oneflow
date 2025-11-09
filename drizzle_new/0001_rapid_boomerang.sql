ALTER TABLE "expenses" ADD COLUMN "invoice_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "customer_invoices" DROP COLUMN "paid_amount";--> statement-breakpoint
ALTER TABLE "purchase_orders" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sales_orders" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "vendor_bills" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "vendor_bills" DROP COLUMN "paid_amount";--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
DROP TYPE "public"."purchase_order_status";--> statement-breakpoint
DROP TYPE "public"."sales_order_status";