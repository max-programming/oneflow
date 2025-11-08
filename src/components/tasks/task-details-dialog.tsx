import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, FileText } from "lucide-react";
import { getProjectTaskByIdFn } from "@/server/tasks";
import { TaskStatusEnum } from "@/db/tables/projects";
import { cn } from "@/lib/utils";
import { DialogProps } from "@radix-ui/react-dialog";

interface TaskDetailsDialogProps {
  taskId: string;
  taskName?: string;
}

function TaskDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Assignees */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskDetailsDialog({
  taskId,
  taskName,
  ...props
}: TaskDetailsDialogProps & DialogProps) {
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task-details", taskId],
    queryFn: () => getProjectTaskByIdFn({ data: { taskId } }),
    enabled: props.open, // Only fetch when dialog is open
    refetchOnWindowFocus: false,
  });

  function formatDateTime(dateString: string | Date) {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getStatusColor = (status: TaskStatusEnum) => {
    switch (status) {
      case "waiting-to-start":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "stuck":
        return "bg-red-100 text-red-800 border-red-200";
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: TaskStatusEnum) => {
    switch (status) {
      case "waiting-to-start":
        return "To Do";
      case "in-progress":
        return "In Progress";
      case "stuck":
        return "Stuck";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  const isOverdue = task
    ? new Date(task.dueDate) < new Date() && task.status !== "done"
    : false;

  return (
    <Dialog {...props}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task?.name || taskName || "Task Details"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <TaskDetailsSkeleton />}

        {error && (
          <div className="flex items-center justify-center py-8">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Failed to load task"}
            </p>
          </div>
        )}

        {task && (
          <div className="space-y-6">
            {/* Status and Metadata */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn(
                  "text-sm font-medium px-3 py-1",
                  getStatusColor(task.status),
                )}
              >
                {getStatusLabel(task.status)}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Created {formatDateTime(task.createdAt)}
              </div>
            </div>

            <Separator />

            {/* Description */}
            {task.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Description</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Start Date</span>
                </div>
                <p className="text-sm bg-muted/30 rounded px-3 py-2">
                  {((dateString: string) => {
                    return new Date(dateString).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  })(task.startDate)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Due Date</span>
                </div>
                <p
                  className={cn(
                    "text-sm rounded px-3 py-2",
                    isOverdue
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-muted/30",
                  )}
                >
                  {((dateString: string) => {
                    return new Date(dateString).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  })(task.dueDate)}
                  {isOverdue && (
                    <span className="ml-2 font-medium">(Overdue)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Assignees */}
            {task.assignees.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    Assignees ({task.assignees.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {task.assignees.map((assignee) => (
                    <div
                      key={assignee.userId}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {assignee.userName
                            ? assignee.userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : assignee.userEmail
                                ?.split("@")[0]
                                ?.slice(0, 2)
                                .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {assignee.userName || "Unknown User"}
                        </div>
                        {assignee.userEmail && (
                          <div className="text-xs text-muted-foreground truncate">
                            {assignee.userEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Last updated {formatDateTime(task.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
