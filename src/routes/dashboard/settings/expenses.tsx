import { createFileRoute } from "@tanstack/react-router";
import { ExpensesTable } from "@/components/expenses-table";

export const Route = createFileRoute("/dashboard/settings/expenses")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Expenses
            </h2>
            <p className="text-muted-foreground">
              Track and approve employee expenses for projects
            </p>
          </div>
        </div>
        <ExpensesTable />
      </div>
    </div>
  );
}
