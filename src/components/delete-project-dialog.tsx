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
import { deleteProjectFn } from "@/server/projects";
import { toast } from "sonner";
import type { Project } from "@/components/project-card";

interface DeleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const queryClient = useQueryClient();

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProjectFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["projects"]);

      // Optimistically remove the project
      queryClient.setQueriesData({ queryKey: ["projects"] }, (old: any) => {
        if (!old) return old;

        // Handle different query structures (could be array or paginated)
        if (Array.isArray(old)) {
          return old.filter((p: any) => p.id !== variables.data.projectId);
        } else if (old.projects) {
          // Paginated structure
          return {
            ...old,
            projects: old.projects.filter(
              (p: any) => p.id !== variables.data.projectId,
            ),
            nextCursor: old.nextCursor,
            hasNextPage: old.hasNextPage,
          };
        }
        return old;
      });

      return { previousProjects };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects"], context.previousProjects);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    },
    onSuccess: () => {
      toast.success("Project deleted successfully");
      onOpenChange(false);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleDelete = () => {
    if (!project) return;

    deleteProjectMutation.mutate({
      data: {
        projectId: project.id,
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the project{" "}
            <span className="font-semibold">{project?.name}</span>. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteProjectMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
