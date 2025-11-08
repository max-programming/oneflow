ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;