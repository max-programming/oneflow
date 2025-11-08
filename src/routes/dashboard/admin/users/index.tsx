import { createFileRoute } from "@tanstack/react-router";
import { UserManagementTable } from "@/components/user-management-table";

export const Route = createFileRoute("/dashboard/admin/users/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              User Management
            </h2>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
        </div>
        <UserManagementTable />
      </div>
    </div>
  );
}
