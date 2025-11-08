import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ChevronDownIcon, CheckIcon, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProjectTaskFn, getNonAdminUsersFn } from "@/server/tasks";
import { getProjectByIdFn } from "@/server/projects";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerButton?: React.ReactNode;
  projectId: string;
  onTaskCreated?: (taskId: string) => void;
}

export function NewTaskDialog({
  open,
  onOpenChange,
  triggerButton,
  projectId,
  onTaskCreated,
}: NewTaskDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [taskName, setTaskName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Fetch project details to get the deadline
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByIdFn({ data: { projectId } }),
  });

  // Fetch non-admin users for assignee selection
  const { data: usersData } = useQuery({
    queryKey: ["non-admin-users"],
    queryFn: () => getNonAdminUsersFn(),
  });

  // Format users for selection
  const userOptions =
    usersData?.map((user) => ({
      value: user.id,
      label: user.name || user.email,
    })) || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: createProjectTaskFn,
    onSuccess: (task) => {
      toast.success("Task created successfully");
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      onTaskCreated?.(task.id);
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task",
      );
    },
  });

  function resetForm() {
    setTaskName("");
    setDescription("");
    setStartDate(new Date());
    setDueDate(undefined);
    setSelectedAssignees([]);
  }

  function handleAssigneeToggle(userId: string) {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

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
    if (selectedAssignees.length === 0) {
      toast.error("At least one assignee is required");
      return;
    }
    if (dueDate <= startDate) {
      toast.error("Due date must be after start date");
      return;
    }
    if (projectData?.deadlineDate) {
      const projectDeadline = new Date(projectData.deadlineDate);
      projectDeadline.setHours(23, 59, 59, 999);
      if (dueDate > projectDeadline) {
        toast.error("Due date cannot be after project deadline");
        return;
      }
    }

    // Format dates as YYYY-MM-DD strings
    const formattedStartDate = startDate.toISOString().split("T")[0];
    const formattedDueDate = dueDate.toISOString().split("T")[0];

    createTaskMutation.mutate({
      data: {
        projectId,
        name: taskName.trim(),
        description: description.trim() || undefined,
        startDate: formattedStartDate,
        dueDate: formattedDueDate,
        assigneeIds: selectedAssignees,
      },
    });
  }

  const selectedUsers = userOptions.filter((user) =>
    selectedAssignees.includes(user.value),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 border-b pb-4">
          <DialogTitle className="text-left text-2xl font-semibold">
            Create New Task
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
                disabled={createTaskMutation.isPending}
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
                disabled={createTaskMutation.isPending}
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
                    disabled={createTaskMutation.isPending}
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
                      // Disable dates before today
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today) {
                        return true;
                      }

                      // Disable dates after project deadline if it exists
                      if (projectData?.deadlineDate) {
                        const projectDeadline = new Date(
                          projectData.deadlineDate,
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
                    disabled={createTaskMutation.isPending}
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
                      if (projectData?.deadlineDate) {
                        const projectDeadline = new Date(
                          projectData.deadlineDate,
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

            {/* Assignees */}
            <div className="space-y-2">
              <Label htmlFor="assignees" className="text-sm font-medium">
                Assignees <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-3">
                {/* Selected Assignees Display */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.value}
                        className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                      >
                        <span>{user.label}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-secondary-foreground/20"
                          onClick={() => handleAssigneeToggle(user.value)}
                          disabled={createTaskMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assignee Selection */}
                <Combobox
                  data={userOptions}
                  type="assignee"
                  value=""
                  onValueChange={(value) => {
                    if (value) handleAssigneeToggle(value);
                  }}
                >
                  <ComboboxTrigger
                    className="w-full"
                    disabled={createTaskMutation.isPending}
                  >
                    <span className="text-muted-foreground">
                      Select assignees...
                    </span>
                  </ComboboxTrigger>
                  <ComboboxContent>
                    <ComboboxInput placeholder="Search users..." />
                    <ComboboxEmpty>No users found.</ComboboxEmpty>
                    <ComboboxList>
                      <ComboboxGroup>
                        {userOptions.map((user) => (
                          <ComboboxItem key={user.value} value={user.value}>
                            <div className="flex items-center justify-between w-full">
                              <span>{user.label}</span>
                              {selectedAssignees.includes(user.value) && (
                                <CheckIcon className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </ComboboxItem>
                        ))}
                      </ComboboxGroup>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
