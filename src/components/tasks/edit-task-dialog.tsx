import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProjectTaskFn } from "@/server/tasks";
import type { TaskStatusEnum } from "@/db/schema";

interface Task {
  taskId: number;
  taskName: string;
  taskDescription?: string | null;
  taskStartDate: string;
  taskDueDate: string;
  taskStatus: TaskStatusEnum;
  projectId: number;
  projectDeadlineDate?: string | null;
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

const statusOptions = [
  { value: "waiting-to-start", label: "Waiting to Start" },
  { value: "in-progress", label: "In Progress" },
  { value: "stuck", label: "Stuck" },
  { value: "done", label: "Done" },
];

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
}: EditTaskDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [taskName, setTaskName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<TaskStatusEnum>("waiting-to-start");

  // Populate form when task changes or dialog opens
  useEffect(() => {
    if (open && task) {
      setTaskName(task.taskName || "");
      setDescription(task.taskDescription || "");
      setStatus(task.taskStatus || "waiting-to-start");

      // Parse dates
      if (task.taskStartDate) {
        const date = new Date(task.taskStartDate);
        setStartDate(isNaN(date.getTime()) ? undefined : date);
      } else {
        setStartDate(undefined);
      }

      if (task.taskDueDate) {
        const date = new Date(task.taskDueDate);
        setDueDate(isNaN(date.getTime()) ? undefined : date);
      } else {
        setDueDate(undefined);
      }
    }
  }, [open, task]);

  // Update task mutation with optimistic updates
  const updateTaskMutation = useMutation({
    mutationFn: updateProjectTaskFn,
    onMutate: async (variables) => {
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

      // Optimistically update project tasks
      queryClient.setQueryData(
        ["project-tasks", task.projectId],
        (old: any) => {
          if (!old) return old;
          return old.map((t: any) =>
            t.id === variables.data.taskId
              ? {
                  ...t,
                  name: variables.data.name || t.name,
                  description: variables.data.description ?? t.description,
                  startDate: variables.data.startDate || t.startDate,
                  dueDate: variables.data.dueDate || t.dueDate,
                  status: variables.data.status || t.status,
                }
              : t,
          );
        },
      );

      // Optimistically update filtered tasks
      const updateFilteredTasks = (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t: any) =>
            t.taskId === variables.data.taskId
              ? {
                  ...t,
                  taskName: variables.data.name || t.taskName,
                  taskDescription:
                    variables.data.description ?? t.taskDescription,
                  taskStartDate: variables.data.startDate || t.taskStartDate,
                  taskDueDate: variables.data.dueDate || t.taskDueDate,
                  taskStatus: variables.data.status || t.taskStatus,
                }
              : t,
          ),
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
          queryClient.setQueryData(queryKey, updateFilteredTasks);
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
      if (context?.previousProjectTasks) {
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
        error instanceof Error ? error.message : "Failed to update task",
      );
    },
    onSuccess: () => {
      toast.success("Task updated successfully");
      onOpenChange(false);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ["project-tasks", task.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["pm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pm-filtered-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tm-filtered-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-filtered-tasks"] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields
    if (!taskName.trim()) {
      toast.error("Task name is required");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }
    if (dueDate <= startDate) {
      toast.error("Due date must be after start date");
      return;
    }
    if (task.projectDeadlineDate) {
      const projectDeadline = new Date(task.projectDeadlineDate);
      projectDeadline.setHours(23, 59, 59, 999);
      if (dueDate > projectDeadline) {
        toast.error("Due date cannot be after project deadline");
        return;
      }
    }

    // Format dates as YYYY-MM-DD strings
    const formattedStartDate = startDate.toISOString().split("T")[0];
    const formattedDueDate = dueDate.toISOString().split("T")[0];

    updateTaskMutation.mutate({
      data: {
        taskId: task.taskId,
        name: taskName.trim(),
        description: description.trim() || undefined,
        startDate: formattedStartDate,
        dueDate: formattedDueDate,
        status: status,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 border-b pb-4">
          <DialogTitle className="text-left text-2xl font-semibold">
            Edit Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="task-name" className="text-sm font-medium">
                Task Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-name"
                name="task-name"
                placeholder="Enter task name"
                required
                className="w-full"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                disabled={updateTaskMutation.isPending}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter task description..."
                className="resize-none min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={updateTaskMutation.isPending}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="start-date"
                    className="w-full justify-between font-normal"
                    disabled={updateTaskMutation.isPending}
                  >
                    <span
                      className={
                        startDate ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {startDate
                        ? startDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select start date"}
                    </span>
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartDateOpen(false);
                    }}
                    disabled={(date) => {
                      // Disable dates after project deadline if it exists
                      if (task.projectDeadlineDate) {
                        const projectDeadline = new Date(
                          task.projectDeadlineDate,
                        );
                        projectDeadline.setHours(23, 59, 59, 999);
                        return date > projectDeadline;
                      }
                      return false;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-sm font-medium">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="due-date"
                    className="w-full justify-between font-normal"
                    disabled={updateTaskMutation.isPending}
                  >
                    <span
                      className={
                        dueDate ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {dueDate
                        ? dueDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select due date"}
                    </span>
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    captionLayout="dropdown"
                    disabled={(date) => {
                      // Disable dates before or equal to start date
                      if (startDate) {
                        const minDate = new Date(startDate);
                        minDate.setHours(0, 0, 0, 0);
                        if (date <= minDate) {
                          return true;
                        }
                      }

                      // Disable dates after project deadline
                      if (task.projectDeadlineDate) {
                        const projectDeadline = new Date(
                          task.projectDeadlineDate,
                        );
                        projectDeadline.setHours(23, 59, 59, 999);
                        if (date > projectDeadline) {
                          return true;
                        }
                      }

                      return false;
                    }}
                    onSelect={(date) => {
                      setDueDate(date);
                      setDueDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Combobox
                data={statusOptions}
                type="status"
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatusEnum)}
              >
                <ComboboxTrigger
                  className="w-full"
                  disabled={updateTaskMutation.isPending}
                />
                <ComboboxContent>
                  <ComboboxInput />
                  <ComboboxEmpty />
                  <ComboboxList>
                    <ComboboxGroup>
                      {statusOptions.map((statusOption) => (
                        <ComboboxItem
                          key={statusOption.value}
                          value={statusOption.value}
                        >
                          {statusOption.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
