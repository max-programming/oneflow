import { createFileRoute } from "@tanstack/react-router";
import { CustomerInvoicesTable } from "@/components/customer-invoices-table";

export const Route = createFileRoute("/dashboard/settings/customer-invoices")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Customer Invoices
            </h2>
            <p className="text-muted-foreground">
              Manage customer invoices and track payment status
            </p>
          </div>
        </div>
        <CustomerInvoicesTable />
      </div>
    </div>
  );
}
