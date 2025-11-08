import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  type DragEndEvent,
} from "@/components/kibo-ui/kanban";
import { TaskCard, type TaskData } from "./task-card";
import { getProjectTasksFn, updateProjectTaskFn } from "@/server/tasks";
import { TaskStatusEnum } from "@/db/tables/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Define base kanban column interface (compatible with KanbanColumnProps)
interface KanbanColumnBase extends Record<string, unknown> {
  id: string;
  name: string;
}

interface TasksKanbanProps {
  projectId: string;
  highlightedTaskId?: string | null;
  onHighlightComplete?: () => void;
}

// Define kanban columns based on task status
const KANBAN_COLUMNS: KanbanColumnBase[] = [
  {
    id: "waiting-to-start",
    name: "To Do",
  },
  {
    id: "in-progress",
    name: "In Progress",
  },
  {
    id: "stuck",
    name: "Stuck",
  },
  {
    id: "done",
    name: "Done",
  },
];

function TasksKanbanSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {KANBAN_COLUMNS.map((column) => (
        <Card key={column.id} className="flex flex-col min-h-40">
          <div className="p-2 border-b">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-8" />
            </div>
          </div>
          <CardContent className="flex-1 p-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TasksKanban({
  projectId,
  highlightedTaskId,
  onHighlightComplete,
}: TasksKanbanProps) {
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState<TaskData[]>([]);

  // Fetch tasks for the project
  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: () => getProjectTasksFn({ data: { projectId } }),
    refetchOnWindowFocus: false,
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: updateProjectTaskFn,
    onSuccess: (updatedTask) => {
      const columnName = KANBAN_COLUMNS.find(
        (col) => col.id === updatedTask.status,
      )?.name;
      toast.success(`Task moved to ${columnName || updatedTask.status}`);
      // Refetch tasks to get the latest data
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task status",
      );
      // Reset local tasks to server state on error
      if (tasks) {
        const transformedTasks: TaskData[] = tasks.map((task) => ({
          ...task,
          column: task.status as string,
          status: task.status, // Preserve TaskStatusEnum type
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        }));
        setLocalTasks(transformedTasks);
      }
    },
  });

  // Update local tasks when server data changes
  useEffect(() => {
    if (tasks) {
      // Transform server data to include column field for kanban
      const transformedTasks: TaskData[] = tasks.map((task) => ({
        ...task,
        column: task.status as string, // Cast TaskStatusEnum to string for kanban compatibility
        status: task.status, // Preserve TaskStatusEnum type
        createdAt: task.createdAt.toISOString(), // Convert Date to string
        updatedAt: task.updatedAt.toISOString(), // Convert Date to string
      }));
      setLocalTasks(transformedTasks);
    }
  }, [tasks]);

  // Handle task highlighting timeout
  useEffect(() => {
    if (highlightedTaskId && onHighlightComplete) {
      const timeout = setTimeout(() => {
        onHighlightComplete();
      }, 2000); // Highlight for 2 seconds

      return () => clearTimeout(timeout);
    }
  }, [highlightedTaskId, onHighlightComplete]);

  const handleDataChange = (newTasks: any[]) => {
    // The kanban provider sends us updated task data, just update local state
    setLocalTasks(newTasks as TaskData[]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeTask = localTasks.find((task) => task.id === active.id);
    if (!activeTask) {
      return;
    }

    // Find the column the task was dropped into
    const overColumn = KANBAN_COLUMNS.find((col) => col.id === over.id);
    const overTask = localTasks.find((task) => task.id === over.id);

    const newStatus = overColumn?.id || overTask?.status;

    if (!newStatus || newStatus === activeTask.status) {
      return;
    }

    // Optimistically update the task status
    const updatedTasks = localTasks.map((task) =>
      task.id === activeTask.id
        ? {
            ...task,
            status: newStatus as TaskStatusEnum,
            column: newStatus as string,
          }
        : task,
    );
    setLocalTasks(updatedTasks);

    // Update task status on server
    updateTaskMutation.mutate({
      data: {
        taskId: activeTask.id,
        status: newStatus as TaskStatusEnum,
      },
    });
  };

  const getTaskCountForStatus = (status: string) => {
    return localTasks.filter((task) => task.column === status).length;
  };

  if (isLoading) {
    return <TasksKanbanSkeleton />;
  }

  if (error) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center">
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Failed to load tasks"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!localTasks || localTasks.length === 0) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">No tasks found</p>
          <p className="text-sm text-muted-foreground">
            Create your first task to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full">
      <KanbanProvider
        columns={KANBAN_COLUMNS}
        data={localTasks}
        onDataChange={handleDataChange}
        onDragEnd={handleDragEnd}
        className="h-full"
      >
        {(column) => (
          <KanbanBoard
            key={column.id}
            id={column.id}
            className="flex flex-col min-h-96"
          >
            <KanbanHeader className="flex items-center justify-between">
              <span className="font-medium">{column.name}</span>
              <Badge variant="secondary" className="text-xs">
                {getTaskCountForStatus(column.id)}
              </Badge>
            </KanbanHeader>

            <KanbanCards id={column.id}>
              {(task) => (
                <TaskCard
                  key={task.id}
                  task={task as TaskData}
                  isHighlighted={highlightedTaskId === task.id}
                />
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>

      {/* TODO: Add drag reordering within columns with database integration */}
      {/* Currently, drag reordering within the same column is handled by the UI only */}
      {/* Future enhancement: Add task order field to database and save order changes */}
    </div>
  );
}
