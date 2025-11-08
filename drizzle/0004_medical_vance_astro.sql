ALTER TABLE "customers" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "phone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_phone_unique" UNIQUE("phone");