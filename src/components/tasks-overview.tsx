import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFilteredProjectManagerTasksFn,
  getFilteredTeamMemberTasksFn,
  getFilteredAdminTasksFn,
  updateTaskStatusFn,
} from "@/server/tasks";
import { Pagination } from "./ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { AssigneeAvatars } from "./assignee-avatars";
import { TaskStatusDropdown } from "./task-status-dropdown";
import { Link } from "@tanstack/react-router";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { toast } from "sonner";
import type { TaskStatusEnum } from "@/db/schema";
import { TaskDetailsDialog } from "./tasks/task-details-dialog";

type FilterType =
  | "all"
  | "overdue"
  | "today"
  | "next-7-days"
  | "upcoming"
  | "completed";

const filterLabels: Record<FilterType, string> = {
  all: "All Tasks",
  overdue: "Overdue",
  today: "Due Today",
  "next-7-days": "Next 7 Days",
  upcoming: "Upcoming",
  completed: "Completed",
};

interface TasksOverviewProps {
  userRole?: "project-manager" | "team-member" | "admin";
}

export function TasksOverview({
  userRole = "project-manager",
}: TasksOverviewProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [selectedTask, setSelectedTask] = React.useState<{
    taskId: string;
    taskName: string;
    projectId: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [
      userRole === "team-member"
        ? "tm-filtered-tasks"
        : userRole === "admin"
          ? "admin-filtered-tasks"
          : "pm-filtered-tasks",
      currentPage,
      filter,
    ],
    queryFn: () => {
      if (userRole === "team-member") {
        return getFilteredTeamMemberTasksFn({
          data: {
            page: currentPage,
            limit: 10,
            filter,
          },
        });
      } else if (userRole === "admin") {
        return getFilteredAdminTasksFn({
          data: {
            page: currentPage,
            limit: 10,
            filter,
          },
        });
      } else {
        return getFilteredProjectManagerTasksFn({
          data: {
            page: currentPage,
            limit: 10,
            filter,
          },
        });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatusEnum;
    }) => {
      return updateTaskStatusFn({
        data: { taskId, status },
      });
    },
    onMutate: async ({ taskId, status }) => {
      // Get the current query key based on user role
      const queryKey =
        userRole === "team-member"
          ? "tm-filtered-tasks"
          : userRole === "admin"
            ? "admin-filtered-tasks"
            : "pm-filtered-tasks";

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [queryKey] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        queryKey,
        currentPage,
        filter,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData([queryKey, currentPage, filter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((task: any) =>
            task.taskId === taskId ? { ...task, taskStatus: status } : task,
          ),
        };
      });

      return { previousData, queryKey };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(
          [context.queryKey, currentPage, filter],
          context.previousData,
        );
      }
      toast.error("Failed to update task status");
    },
    onSuccess: () => {
      toast.success("Task status updated successfully");
    },
    onSettled: () => {
      // Invalidate queries after mutation is settled
      const queryKey =
        userRole === "team-member"
          ? "tm-filtered-tasks"
          : userRole === "admin"
            ? "admin-filtered-tasks"
            : "pm-filtered-tasks";

      queryClient.invalidateQueries({ queryKey: [queryKey] });

      // Also invalidate today's tasks if the role is team-member or project-manager
      if (userRole === "team-member") {
        queryClient.invalidateQueries({ queryKey: ["tm-todays-tasks"] });
      } else if (userRole === "project-manager") {
        queryClient.invalidateQueries({ queryKey: ["pm-todays-tasks"] });
      } else if (userRole === "admin") {
        queryClient.invalidateQueries({ queryKey: ["admin-todays-tasks"] });
      }
    },
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatusEnum) => {
    updateStatusMutation.mutate({ taskId, status: newStatus });
  };

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const getDateBadge = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isPast(due) && !isToday(due)) {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          Overdue
        </Badge>
      );
    }

    if (isToday(due)) {
      return (
        <Badge variant="default" className="whitespace-nowrap">
          Today
        </Badge>
      );
    }

    const daysUntil = differenceInDays(due, today);
    if (daysUntil <= 7) {
      return (
        <Badge variant="secondary" className="whitespace-nowrap">
          {daysUntil} {daysUntil === 1 ? "day" : "days"}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="whitespace-nowrap">
        {format(due, "MMM d")}
      </Badge>
    );
  };

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Error loading tasks: {error.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks Overview</h2>
          {data && (
            <p className="text-sm text-muted-foreground">
              Showing {data.tasks.length} of {data.pagination.totalCount} tasks
            </p>
          )}
        </div>

        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {filterLabels[filter]}
              {data && data.counts[filter] > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({data.counts[filter]})
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(filterLabels) as FilterType[]).map((filterKey) => (
              <SelectItem key={filterKey} value={filterKey}>
                <div className="flex items-center justify-between gap-4">
                  <span>{filterLabels[filterKey]}</span>
                  {data && (
                    <span className="text-muted-foreground">
                      ({data.counts[filterKey]})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data && data.tasks.length > 0 ? (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.map((task) => (
                  <TableRow
                    key={task.taskId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTask({
                        taskId: task.taskId,
                        taskName: task.taskName,
                        projectId: task.projectId,
                      });
                    }}
                  >
                    <TableCell>
                      <Link
                        to="/dashboard/projects/$projectId"
                        params={{ projectId: task.projectId }}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.taskName}
                      </Link>
                      {task.taskDescription && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                          {task.taskDescription}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/dashboard/projects/$projectId"
                        params={{ projectId: task.projectId }}
                        className="text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.projectName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AssigneeAvatars assignees={task.assignees} />
                    </TableCell>
                    <TableCell>{getDateBadge(task.taskDueDate)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TaskStatusDropdown
                        status={task.taskStatus}
                        onChange={(newStatus) =>
                          handleStatusChange(task.taskId, newStatus)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={data.pagination.currentPage}
                totalPages={data.pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No tasks found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {filter === "all"
                ? "You don't have any tasks yet."
                : `No ${filterLabels[filter].toLowerCase()} tasks found.`}
            </p>
          </div>
        </Card>
      )}

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          taskId={selectedTask.taskId}
          taskName={selectedTask.taskName}
          projectId={selectedTask.projectId}
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTask(null);
            }
          }}
        />
      )}
    </div>
  );
}
