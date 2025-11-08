ALTER TABLE "project_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "project_members" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "manager_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;