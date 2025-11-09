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
import { getProjectTasksFn, updateTaskStatusFn } from "@/server/tasks";
import { TaskStatusEnum } from "@/db/tables/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditTaskDialog } from "./edit-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { toast } from "sonner";

// Define base kanban column interface (compatible with KanbanColumnProps)
interface KanbanColumnBase extends Record<string, unknown> {
  id: string;
  name: string;
}

interface TasksKanbanProps {
  projectId: number;
  highlightedTaskId?: string | null;
  onHighlightComplete?: () => void;
  isAdminOrProjectManager?: boolean;
}

interface EditableTask {
  taskId: string;
  taskName: string;
  taskDescription?: string | null;
  taskStartDate: string;
  taskDueDate: string;
  taskStatus: TaskStatusEnum;
  projectId: string;
  projectDeadlineDate?: string | null;
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
  isAdminOrProjectManager = false,
}: TasksKanbanProps) {
  const queryClient = useQueryClient();

  // State for managing edit/delete dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EditableTask | null>(null);

  const handleEditClick = (task: TaskData) => {
    // Convert TaskData to EditableTask format
    const editableTask: EditableTask = {
      taskId: task.id,
      taskName: task.name,
      taskDescription: task.description,
      taskStartDate: task.startDate,
      taskDueDate: task.dueDate,
      taskStatus: task.status,
      projectId: projectId,
      projectDeadlineDate: null, // We'll need to get this from somewhere
    };
    setSelectedTask(editableTask);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (task: TaskData) => {
    // Convert TaskData to a format suitable for delete dialog
    const taskForDelete: EditableTask = {
      taskId: task.id,
      taskName: task.name,
      taskDescription: task.description,
      taskStartDate: task.startDate,
      taskDueDate: task.dueDate,
      taskStatus: task.status,
      projectId: projectId,
      projectDeadlineDate: null,
    };
    setSelectedTask(taskForDelete);
    setDeleteDialogOpen(true);
  };

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

  const [localTasks, setLocalTasks] = useState(tasks || []);

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: updateTaskStatusFn,
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
        setLocalTasks(tasks);
      }
    },
  });

  // Handle task highlighting timeout
  useEffect(() => {
    if (highlightedTaskId && onHighlightComplete) {
      const timeout = setTimeout(() => {
        onHighlightComplete();
      }, 2000); // Highlight for 2 seconds

      return () => clearTimeout(timeout);
    }
  }, [highlightedTaskId, onHighlightComplete]);

  useEffect(() => {
    setLocalTasks(tasks || []);
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeTask = localTasks.find(
      (task) => task.id === parseInt(active.id as string),
    );
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
    setLocalTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === activeTask.id
          ? { ...task, status: newStatus as TaskStatusEnum }
          : task,
      ),
    );

    console.log(typeof activeTask.id);
    // Update task status on server
    updateTaskMutation.mutate({
      data: {
        taskId: activeTask.id,
        status: newStatus as TaskStatusEnum,
      },
    });
  };

  const getTaskCountForStatus = (status: string) => {
    return localTasks.filter((task) => task.status === status).length;
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
      {/* Edit Dialog */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog */}
      <DeleteTaskDialog
        task={selectedTask}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <KanbanProvider
        columns={KANBAN_COLUMNS}
        data={localTasks.map((t) => ({
          ...t,
          column: t.status,
          id: t.id.toString(),
        }))}
        onDataChange={(newTasks) =>
          setLocalTasks(newTasks.map((t) => ({ ...t, id: parseInt(t.id) })))
        }
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
                  task={task as unknown as TaskData}
                  isHighlighted={highlightedTaskId === task.id}
                  projectId={projectId}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  isAdminOrProjectManager={isAdminOrProjectManager}
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
