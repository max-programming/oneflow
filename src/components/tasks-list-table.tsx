import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getProjectManagerTasksFn,
  getTeamMemberTasksFn,
  getAdminTasksFn,
  updateTaskStatusFn,
} from "@/server/tasks";
import { AssigneeAvatars } from "./assignee-avatars";
import { TaskStatusDropdown } from "./task-status-dropdown";
import { Pagination } from "./ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "./ui/skeleton";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  differenceInDays,
} from "date-fns";
import type { TaskStatusEnum } from "@/db/schema";

interface TasksListTableProps {
  limit?: number;
  userRole?: "project-manager" | "team-member" | "admin";
}

export function TasksListTable({
  limit = 10,
  userRole = "project-manager",
}: TasksListTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [
      userRole === "team-member"
        ? "tm-tasks"
        : userRole === "admin"
          ? "admin-tasks"
          : "pm-tasks",
      currentPage,
      limit,
    ],
    queryFn: () => {
      if (userRole === "team-member") {
        return getTeamMemberTasksFn({
          data: {
            page: currentPage,
            limit,
          },
        });
      } else if (userRole === "admin") {
        return getAdminTasksFn({
          data: {
            page: currentPage,
            limit,
          },
        });
      } else {
        return getProjectManagerTasksFn({
          data: {
            page: currentPage,
            limit,
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
      return updateTaskStatusFn({ data: { taskId, status } });
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["pm-tasks"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "pm-tasks",
        currentPage,
        limit,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(["pm-tasks", currentPage, limit], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((task: any) =>
            task.taskId === taskId ? { ...task, taskStatus: status } : task,
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["pm-tasks", currentPage, limit],
          context.previousData,
        );
      }
      toast.error("Failed to update task status");
    },
    onSuccess: () => {
      toast.success("Task status updated successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-tasks"] });
    },
  });

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);

    if (isToday(date)) {
      return { text: "Today", color: "text-orange-600 font-semibold" };
    }

    if (isTomorrow(date)) {
      return { text: "Tomorrow", color: "text-yellow-600 font-semibold" };
    }

    if (isPast(date)) {
      const daysOverdue = Math.abs(differenceInDays(new Date(), date));
      return {
        text: `${format(date, "MMM d, yyyy")} (${daysOverdue}d overdue)`,
        color: "text-red-600 font-semibold",
      };
    }

    const daysUntilDue = differenceInDays(date, new Date());
    if (daysUntilDue <= 3) {
      return {
        text: format(date, "MMM d, yyyy"),
        color: "text-orange-600",
      };
    }

    return {
      text: format(date, "MMM d, yyyy"),
      color: "text-muted-foreground",
    };
  };

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Error loading tasks: {error.message}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tasks Overview</h2>
        {data && (
          <p className="text-sm text-muted-foreground">
            Showing {data.tasks.length} of {data.pagination.totalCount} tasks
          </p>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </Card>
      ) : data && data.tasks.length > 0 ? (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Task</TableHead>
                  <TableHead className="w-[20%]">Project</TableHead>
                  <TableHead className="w-[15%]">Assignees</TableHead>
                  <TableHead className="w-[15%]">Due Date</TableHead>
                  <TableHead className="w-[20%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.map((task) => {
                  const dueDateInfo = formatDueDate(task.taskDueDate);

                  return (
                    <TableRow key={task.taskId}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-none">
                            {task.taskName}
                          </p>
                          {task.taskDescription && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.taskDescription}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/dashboard/projects/$projectId"
                          params={{ projectId: task.projectId }}
                          className="text-sm hover:underline"
                        >
                          {task.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <AssigneeAvatars
                          assignees={task.assignees}
                          maxDisplay={3}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm", dueDateInfo.color)}>
                          {dueDateInfo.text}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TaskStatusDropdown
                          status={task.taskStatus}
                          onChange={(newStatus) =>
                            updateStatusMutation.mutate({
                              taskId: task.taskId,
                              status: newStatus,
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              There are no tasks assigned to your projects yet.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
