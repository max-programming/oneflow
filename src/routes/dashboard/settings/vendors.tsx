import { createFileRoute } from "@tanstack/react-router";
import { VendorManagementTable } from "@/components/vendor-management-table";

export const Route = createFileRoute("/dashboard/settings/vendors")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Vendor Management
            </h2>
            <p className="text-muted-foreground">
              Manage vendor accounts, information, and payment terms
            </p>
          </div>
        </div>
        <VendorManagementTable />
      </div>
    </div>
  );
}
