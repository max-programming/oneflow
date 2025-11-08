import { SectionCards } from "@/components/section-cards";
import { ProjectStatusChart } from "@/components/project-status-chart";
import { TodaysTasks } from "@/components/todays-tasks";
import { ProjectsWithFilter } from "@/components/projects-with-filter";
import { TasksListTable } from "@/components/tasks-list-table";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProjectManagerDashboardFn } from "@/server/projects";
import { getProjectManagerTodaysTasksFn } from "@/server/tasks";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ["pm-dashboard"],
    queryFn: () => getProjectManagerDashboardFn(),
    enabled:
      session?.user?.role === "project-manager" ||
      session?.user?.role === "admin",
  });

  const {
    data: todaysTasks,
    isLoading: isTasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["pm-todays-tasks"],
    queryFn: () => getProjectManagerTodaysTasksFn(),
    enabled:
      session?.user?.role === "project-manager" ||
      session?.user?.role === "admin",
  });

  // Show appropriate message for non-PM users
  if (
    session?.user?.role !== "project-manager" &&
    session?.user?.role !== "admin"
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold">Welcome to OneFlow</h2>
        <p className="mt-4 text-center text-muted-foreground">
          This dashboard is designed for project managers. Please contact your
          administrator for access.
        </p>
      </div>
    );
  }

  if (session.user.role === "admin") {
    return (
      <div className="flex flex-1 flex-col p-8">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-8 py-4 md:gap-10 md:py-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p>WIP...</p>
        </div>
      </div>
    );
  }

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
            statistics={dashboardData?.statistics}
            isLoading={isDashboardLoading}
          />

          {/* Today's Tasks and Status Chart */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
            <TodaysTasks tasks={todaysTasks} isLoading={isTasksLoading} />
            <ProjectStatusChart
              statusDistribution={dashboardData?.statusDistribution}
              isLoading={isDashboardLoading}
            />
          </div>

          {/* Projects Section with Filter and Pagination */}
          <div className="px-4 lg:px-6">
            <ProjectsWithFilter />
          </div>

          {/* Tasks List Table */}
          <div className="px-4 lg:px-6">
            <TasksListTable limit={10} />
          </div>

          {/* Error States */}
          {(dashboardError || tasksError) && (
            <div className="px-4 lg:px-6">
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                <p className="font-semibold">Error loading dashboard data</p>
                <p className="text-sm">
                  {dashboardError?.message || tasksError?.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
