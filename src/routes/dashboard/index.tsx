import { SectionCards } from "@/components/section-cards";
import { ProjectStatusChart } from "@/components/project-status-chart";
import { TodaysTasks } from "@/components/todays-tasks";
import { ProjectsWithFilter } from "@/components/projects-with-filter";
import { TasksOverview } from "@/components/tasks-overview";
import { DashboardFinancialSummary } from "@/components/dashboard-financial-summary";
import { SalesFinanceStatsCards } from "@/components/sales-finance-stats-cards";
import { SalesFinanceRevenueChart } from "@/components/sales-finance-revenue-chart";
import { SalesFinanceInvoiceChart } from "@/components/sales-finance-invoice-chart";
import { SalesFinanceCustomerList } from "@/components/sales-finance-customer-list";
import { CustomerInvoicesTable } from "@/components/customer-invoices-table";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getProjectManagerDashboardFn,
  getTeamMemberDashboardFn,
  getAdminDashboardFn,
} from "@/server/projects";
import {
  getProjectManagerTodaysTasksFn,
  getTeamMemberTodaysTasksFn,
  getAdminTodaysTasksFn,
} from "@/server/tasks";
import { getSalesFinanceDashboardFn } from "@/server/sales-finance-dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const isProjectManager = session?.user?.role === "project-manager";
  const isAdmin = session?.user?.role === "admin";
  const isTeamMember = session?.user?.role === "team-member";
  const isSalesFinance = session?.user?.role === "sales-finance";

  // Project Manager Dashboard Data
  const {
    data: pmDashboardData,
    isLoading: isPMDashboardLoading,
    error: pmDashboardError,
  } = useQuery({
    queryKey: ["pm-dashboard"],
    queryFn: () => getProjectManagerDashboardFn(),
    enabled: isProjectManager || isAdmin,
  });

  const {
    data: pmTodaysTasks,
    isLoading: isPMTasksLoading,
    error: pmTasksError,
  } = useQuery({
    queryKey: ["pm-todays-tasks"],
    queryFn: () => getProjectManagerTodaysTasksFn(),
    enabled: isProjectManager || isAdmin,
  });

  // Team Member Dashboard Data
  const {
    data: tmDashboardData,
    isLoading: isTMDashboardLoading,
    error: tmDashboardError,
  } = useQuery({
    queryKey: ["tm-dashboard"],
    queryFn: () => getTeamMemberDashboardFn(),
    enabled: isTeamMember,
  });

  const {
    data: tmTodaysTasks,
    isLoading: isTMTasksLoading,
    error: tmTasksError,
  } = useQuery({
    queryKey: ["tm-todays-tasks"],
    queryFn: () => getTeamMemberTodaysTasksFn(),
    enabled: isTeamMember,
  });

  // Admin Dashboard Data
  const {
    data: adminDashboardData,
    isLoading: isAdminDashboardLoading,
    error: adminDashboardError,
  } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => getAdminDashboardFn(),
    enabled: isAdmin,
  });

  const {
    data: adminTodaysTasks,
    isLoading: isAdminTasksLoading,
    error: adminTasksError,
  } = useQuery({
    queryKey: ["admin-todays-tasks"],
    queryFn: () => getAdminTodaysTasksFn(),
    enabled: isAdmin,
  });

  // Sales & Finance Dashboard Data
  const {
    data: sfDashboardData,
    isLoading: isSFDashboardLoading,
    error: sfDashboardError,
  } = useQuery({
    queryKey: ["sf-dashboard"],
    queryFn: () => getSalesFinanceDashboardFn(),
    enabled: isSalesFinance,
  });

  // Sales & Finance Dashboard
  if (isSalesFinance) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
              <h1 className="text-3xl font-bold tracking-tight">
                Sales & Finance Dashboard
              </h1>
              <p className="text-muted-foreground">
                Overview of revenue, invoices, sales orders, and customers
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="px-4 lg:px-6">
              <SalesFinanceStatsCards
                statistics={sfDashboardData}
                isLoading={isSFDashboardLoading}
              />
            </div>

            {/* Revenue Chart */}
            <div className="px-4 lg:px-6">
              <SalesFinanceRevenueChart />
            </div>

            {/* Invoice Payment Status & Top Customers */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <SalesFinanceInvoiceChart />
              <SalesFinanceCustomerList />
            </div>

            {/* Customer Invoices Table */}
            <div className="px-4 lg:px-6">
              <div className="space-y-4">
                <CustomerInvoicesTable />
              </div>
            </div>

            {/* Projects Section with Filter */}
            <div className="px-4 lg:px-6">
              <div className="space-y-4">
                <ProjectsWithFilter userRole="sales-finance" />
              </div>
            </div>

            {/* Error States */}
            {sfDashboardError && (
              <div className="px-4 lg:px-6">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                  <p className="font-semibold">Error loading dashboard data</p>
                  <p className="text-sm">{sfDashboardError?.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
              <h1 className="text-3xl font-bold tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Overview of all projects and tasks across the entire system
              </p>
            </div>

            {/* Statistics Cards */}
            <SectionCards
              statistics={adminDashboardData?.statistics}
              isLoading={isAdminDashboardLoading}
            />

            {/* Financial Summary */}
            <DashboardFinancialSummary />

            {/* Today's Tasks and Status Chart */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <TodaysTasks
                tasks={adminTodaysTasks}
                isLoading={isAdminTasksLoading}
              />
              <ProjectStatusChart
                statusDistribution={adminDashboardData?.statusDistribution}
                isLoading={isAdminDashboardLoading}
              />
            </div>

            {/* Projects Section with Filter and Pagination */}
            <div className="px-4 lg:px-6">
              <ProjectsWithFilter userRole="admin" />
            </div>

            {/* Tasks Overview with Filters */}
            <div className="px-4 lg:px-6">
              <TasksOverview userRole="admin" />
            </div>

            {/* Error States */}
            {(adminDashboardError || adminTasksError) && (
              <div className="px-4 lg:px-6">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                  <p className="font-semibold">Error loading dashboard data</p>
                  <p className="text-sm">
                    {adminDashboardError?.message || adminTasksError?.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Team Member Dashboard
  if (isTeamMember) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
              <h1 className="text-3xl font-bold tracking-tight">
                My Dashboard
              </h1>
              <p className="text-muted-foreground">
                Overview of your assigned projects and tasks
              </p>
            </div>

            {/* Statistics Cards */}
            <SectionCards
              statistics={tmDashboardData?.statistics}
              isLoading={isTMDashboardLoading}
            />

            {/* Today's Tasks and Status Chart */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
              <TodaysTasks tasks={tmTodaysTasks} isLoading={isTMTasksLoading} />
              <ProjectStatusChart
                statusDistribution={tmDashboardData?.statusDistribution}
                isLoading={isTMDashboardLoading}
              />
            </div>

            {/* Projects Section with Filter and Pagination */}
            <div className="px-4 lg:px-6">
              <ProjectsWithFilter userRole="team-member" />
            </div>

            {/* Tasks Overview with Filters */}
            <div className="px-4 lg:px-6">
              <TasksOverview userRole="team-member" />
            </div>

            {/* Error States */}
            {(tmDashboardError || tmTasksError) && (
              <div className="px-4 lg:px-6">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                  <p className="font-semibold">Error loading dashboard data</p>
                  <p className="text-sm">
                    {tmDashboardError?.message || tmTasksError?.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Project Manager Dashboard
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-6">
          {/* Header */}
          <div className="px-4 lg:px-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Project Manager Dashboard
            </h1>
            <p className="text-muted-foreground">
              Overview of your projects and tasks
            </p>
          </div>

          {/* Statistics Cards */}
          <SectionCards
            statistics={pmDashboardData?.statistics}
            isLoading={isPMDashboardLoading}
          />

          {/* Financial Summary */}
          <DashboardFinancialSummary />

          {/* Today's Tasks and Status Chart */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
            <TodaysTasks tasks={pmTodaysTasks} isLoading={isPMTasksLoading} />
            <ProjectStatusChart
              statusDistribution={pmDashboardData?.statusDistribution}
              isLoading={isPMDashboardLoading}
            />
          </div>

          {/* Projects Section with Filter and Pagination */}
          <div className="px-4 lg:px-6">
            <ProjectsWithFilter userRole="project-manager" />
          </div>

          {/* Tasks Overview with Filters */}
          <div className="px-4 lg:px-6">
            <TasksOverview userRole="project-manager" />
          </div>

          {/* Error States */}
          {(pmDashboardError || pmTasksError) && (
            <div className="px-4 lg:px-6">
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                <p className="font-semibold">Error loading dashboard data</p>
                <p className="text-sm">
                  {pmDashboardError?.message || pmTasksError?.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
