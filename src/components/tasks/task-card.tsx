import { KanbanCard } from "@/components/kibo-ui/kanban";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, User, Eye } from "lucide-react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TaskStatusEnum } from "@/db/tables/projects";
import { TaskDetailsDialog } from "./task-details-dialog";

// Define base kanban item interface (compatible with KanbanItemProps)
interface KanbanItemBase extends Record<string, unknown> {
  id: string;
  name: string;
  column: string;
}

export interface TaskData extends KanbanItemBase {
  description?: string | null;
  status: TaskStatusEnum;
  startDate: string;
  dueDate: string;
  assignees: Array<{
    userId: string;
    userName: string | null;
    userEmail: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TaskCardProps {
  task: TaskData;
  isHighlighted?: boolean;
  className?: string;
  projectId?: string;
  onEdit?: (task: TaskData) => void;
  onDelete?: (task: TaskData) => void;
  isAdminOrProjectManager?: boolean;
}

export function TaskCard({
  task,
  isHighlighted = false,
  className,
  projectId,
  onEdit,
  onDelete,
  isAdminOrProjectManager = false,
}: TaskCardProps) {
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

  const isOverdue =
    new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div className="relative">
      <div className="absolute right-3 bottom-3 flex items-center gap-1 z-10">
        <TaskDetailsDialog
          taskId={task.id}
          taskName={task.name}
          projectId={projectId}
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TaskDetailsDialog>
        {isAdminOrProjectManager && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-primary/10"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(task);
                }}
              >
                <IconPencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(task);
                }}
              >
                <IconTrash className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <KanbanCard
        id={task.id}
        name={task.name}
        column={task.column}
        className={cn(
          "transition-all duration-300",
          isHighlighted && "ring-2 ring-primary ring-offset-2 shadow-lg",
          className,
        )}
      >
        <div className="space-y-3">
          {/* Header with title and status */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2 leading-tight flex-1">
                {task.name}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    getStatusColor(task.status),
                  )}
                >
                  {getStatusLabel(task.status)}
                </Badge>
              </div>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Start: {formatDate(task.startDate)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span
                className={cn(
                  isOverdue
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground",
                )}
              >
                Due: {formatDate(task.dueDate)}
                {isOverdue && " (Overdue)"}
              </span>
            </div>
          </div>

          {/* Assignees */}
          {task.assignees.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assignees:</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {task.assignees.slice(0, 3).map((assignee) => (
                    <Avatar
                      key={assignee.userId}
                      className="h-6 w-6 border-2 border-background"
                    >
                      <AvatarFallback className="text-xs bg-muted">
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
                  ))}
                  {task.assignees.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        +{task.assignees.length - 3}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-2 text-xs text-muted-foreground">
                  {task.assignees.length === 1
                    ? "1 person"
                    : `${task.assignees.length} people`}
                </div>
              </div>
            </div>
          )}
        </div>
      </KanbanCard>
    </div>
  );
}
