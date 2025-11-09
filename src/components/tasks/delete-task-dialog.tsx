import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProjectTaskFn } from "@/server/tasks";
import { toast } from "sonner";

interface Task {
  taskId: string;
  taskName: string;
  projectId: string;
}

interface DeleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
}: DeleteTaskDialogProps) {
  const queryClient = useQueryClient();

  const deleteTaskMutation = useMutation({
    mutationFn: deleteProjectTaskFn,
    onMutate: async (variables) => {
      if (!task) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["project-tasks", task.projectId],
      });
      await queryClient.cancelQueries({ queryKey: ["pm-tasks"] });
      await queryClient.cancelQueries({ queryKey: ["tm-tasks"] });
      await queryClient.cancelQueries({ queryKey: ["admin-tasks"] });
      await queryClient.cancelQueries({ queryKey: ["pm-filtered-tasks"] });
      await queryClient.cancelQueries({ queryKey: ["tm-filtered-tasks"] });
      await queryClient.cancelQueries({ queryKey: ["admin-filtered-tasks"] });

      // Snapshot the previous values
      const previousProjectTasks = queryClient.getQueryData([
        "project-tasks",
        task.projectId,
      ]);
      const previousPmTasks = queryClient.getQueryData(["pm-tasks"]);
      const previousTmTasks = queryClient.getQueryData(["tm-tasks"]);
      const previousAdminTasks = queryClient.getQueryData(["admin-tasks"]);

      // Optimistically remove from project tasks
      queryClient.setQueryData(
        ["project-tasks", task.projectId],
        (old: any) => {
          if (!old) return old;
          return old.filter((t: any) => t.id !== variables.data.taskId);
        },
      );

      // Optimistically remove from filtered tasks
      const removeFromFilteredTasks = (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.filter(
            (t: any) => t.taskId !== variables.data.taskId,
          ),
          pagination: {
            ...old.pagination,
            totalCount: Math.max(0, (old.pagination?.totalCount || 0) - 1),
          },
        };
      };

      // Update all filtered task queries
      const queryKeys = [
        ["pm-filtered-tasks"],
        ["tm-filtered-tasks"],
        ["admin-filtered-tasks"],
      ];

      queryKeys.forEach((key) => {
        const queries = queryClient.getQueriesData({ queryKey: key });
        queries.forEach(([queryKey]) => {
          queryClient.setQueryData(queryKey, removeFromFilteredTasks);
        });
      });

      return {
        previousProjectTasks,
        previousPmTasks,
        previousTmTasks,
        previousAdminTasks,
      };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (task && context?.previousProjectTasks) {
        queryClient.setQueryData(
          ["project-tasks", task.projectId],
          context.previousProjectTasks,
        );
      }
      if (context?.previousPmTasks) {
        queryClient.setQueryData(["pm-tasks"], context.previousPmTasks);
      }
      if (context?.previousTmTasks) {
        queryClient.setQueryData(["tm-tasks"], context.previousTmTasks);
      }
      if (context?.previousAdminTasks) {
        queryClient.setQueryData(["admin-tasks"], context.previousAdminTasks);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    },
    onSuccess: () => {
      toast.success("Task deleted successfully");
      onOpenChange(false);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      if (task) {
        queryClient.invalidateQueries({
          queryKey: ["project-tasks", task.projectId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["pm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pm-filtered-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tm-filtered-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-filtered-tasks"] });
    },
  });

  const handleDelete = () => {
    if (!task) return;

    deleteTaskMutation.mutate({
      data: {
        taskId: task.taskId,
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the task{" "}
            <span className="font-semibold">{task?.taskName}</span>. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTaskMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteTaskMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
