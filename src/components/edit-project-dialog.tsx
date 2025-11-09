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
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from "@/components/kibo-ui/tags";
import { useEffect, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { getCustomersFn } from "@/server/customer";
import { getProjectManagersFn, updateProjectFn } from "@/server/projects";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ProjectStatusEnum } from "@/db/schema";
import { toast } from "sonner";
import type { Project } from "@/components/project-card";

const defaultTags = [
  { id: "react", label: "React" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "nextjs", label: "Next.js" },
  { id: "vuejs", label: "Vue.js" },
  { id: "angular", label: "Angular" },
  { id: "svelte", label: "Svelte" },
  { id: "nodejs", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "ruby", label: "Ruby" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "php", label: "PHP" },
  { id: "go", label: "Go" },
];

const statusOptions = [
  {
    value: "in-progress",
    label: "In Progress",
  },
  {
    value: "waiting-to-start",
    label: "Waiting to Start",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "on-hold",
    label: "On Hold",
  },
];

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [selected, setSelected] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [tags, setTags] =
    useState<{ id: string; label: string }[]>(defaultTags);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [projectManager, setProjectManager] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [status, setStatus] = useState<ProjectStatusEnum>("waiting-to-start");
  const [projectName, setProjectName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Populate form with project data when dialog opens
  useEffect(() => {
    if (open && project) {
      setProjectName(project.name || "");
      setDescription(project.description || "");
      setStatus(project.status || "waiting-to-start");
      setProjectManager(project.managerId || "");
      setCustomer(project.customerId || "");

      // Parse dates
      if (project.startDate) {
        const date = new Date(project.startDate);
        setStartDate(isNaN(date.getTime()) ? undefined : date);
      } else {
        setStartDate(undefined);
      }

      if (project.deadlineDate) {
        const date = new Date(project.deadlineDate);
        setDeadline(isNaN(date.getTime()) ? undefined : date);
      } else {
        setDeadline(undefined);
      }

      // Parse tags
      if (project.tags && project.tags.length > 0) {
        const projectTags = project.tags.map((tag) => ({
          id: tag.toLowerCase().replace(/\s+/g, "-"),
          label: tag,
        }));

        // Merge with default tags
        const allTags = [...defaultTags];
        projectTags.forEach((projectTag) => {
          if (!allTags.some((t) => t.id === projectTag.id)) {
            allTags.push(projectTag);
          }
        });

        setTags(allTags);
        setSelected(projectTags.map((t) => t.id));
      } else {
        setTags(defaultTags);
        setSelected([]);
      }
    }
  }, [open, project]);

  // Fetch project managers and customers
  const { data: projectManagersData } = useQuery({
    queryKey: ["project-managers"],
    queryFn: () => getProjectManagersFn(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomersFn(),
  });

  // Format project managers and customers for combobox
  const userOptions =
    projectManagersData?.map((manager) => ({
      value: manager.id,
      label: manager.name,
    })) || [];

  const customerOptions =
    customersData?.map((customer) => ({
      value: customer.id,
      label: customer.name,
    })) || [];

  // Update project mutation with optimistic updates
  const updateProjectMutation = useMutation({
    mutationFn: updateProjectFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(["projects"]);

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["projects"] }, (old: any) => {
        if (!old) return old;

        // Handle different query structures (could be array or paginated)
        if (Array.isArray(old)) {
          return old.map((p: any) =>
            p.id === variables.data.projectId
              ? {
                  ...p,
                  name: variables.data.name || p.name,
                  description: variables.data.description ?? p.description,
                  status: variables.data.status || p.status,
                  managerId: variables.data.managerId || p.managerId,
                  customerId: variables.data.customerId || p.customerId,
                  startDate: variables.data.startDate || p.startDate,
                  deadlineDate: variables.data.deadlineDate || p.deadlineDate,
                  tags: variables.data.tags || p.tags,
                }
              : p,
          );
        } else if (old.projects) {
          // Paginated structure
          return {
            ...old,
            projects: old.projects.map((p: any) =>
              p.id === variables.data.projectId
                ? {
                    ...p,
                    name: variables.data.name || p.name,
                    description: variables.data.description ?? p.description,
                    status: variables.data.status || p.status,
                    managerId: variables.data.managerId || p.managerId,
                    customerId: variables.data.customerId || p.customerId,
                    startDate: variables.data.startDate || p.startDate,
                    deadlineDate: variables.data.deadlineDate || p.deadlineDate,
                    tags: variables.data.tags || p.tags,
                  }
                : p,
            ),
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
        error instanceof Error ? error.message : "Failed to update project",
      );
    },
    onSuccess: () => {
      toast.success("Project updated successfully");
      onOpenChange(false);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function handleRemove(value: string) {
    if (!selected.includes(value)) {
      return;
    }
    setSelected((prev) => prev.filter((v) => v !== value));
  }

  function handleSelect(value: string) {
    if (selected.includes(value)) {
      handleRemove(value);
      return;
    }
    setSelected((prev) => [...prev, value]);
  }

  function handleCreateTag() {
    if (!newTag.trim()) return;
    setTags((prev) => [
      ...prev,
      {
        id: newTag.toLowerCase().replace(/\s+/g, "-"),
        label: newTag,
      },
    ]);
    setSelected((prev) => [...prev, newTag.toLowerCase().replace(/\s+/g, "-")]);
    setNewTag("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!projectManager) {
      toast.error("Project manager is required");
      return;
    }
    if (!customer) {
      toast.error("Customer is required");
      return;
    }

    // Format dates as YYYY-MM-DD strings
    const formattedStartDate = startDate
      ? startDate.toISOString().split("T")[0]
      : undefined;
    const formattedDeadlineDate = deadline
      ? deadline.toISOString().split("T")[0]
      : undefined;

    // Get tag labels (not IDs) for storage
    const tagLabels = selected
      .map((tagId) => tags.find((t) => t.id === tagId)?.label)
      .filter(Boolean) as string[];

    updateProjectMutation.mutate({
      data: {
        projectId: project.id,
        name: projectName.trim(),
        description: description.trim() || undefined,
        status: status,
        managerId: projectManager,
        customerId: customer,
        startDate: formattedStartDate,
        deadlineDate: formattedDeadlineDate,
        tags: tagLabels,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="space-y-3 border-b pb-4">
          <DialogTitle className="text-left text-2xl font-semibold">
            Edit Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium">
                Project Name
              </Label>
              <Input
                id="project-name"
                name="project-name"
                placeholder="Enter project name"
                required
                className="w-full"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={updateProjectMutation.isPending}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="project-tags" className="text-sm font-medium">
                Tags
              </Label>
              <Tags className="w-full">
                <TagsTrigger disabled={updateProjectMutation.isPending}>
                  {selected.map((tag) => (
                    <TagsValue key={tag} onRemove={() => handleRemove(tag)}>
                      {tags.find((t) => t.id === tag)?.label}
                    </TagsValue>
                  ))}
                </TagsTrigger>
                <TagsContent className="w-full">
                  <TagsInput
                    value={newTag}
                    onValueChange={setNewTag}
                    placeholder="Search tag..."
                    disabled={updateProjectMutation.isPending}
                  />
                  <TagsList>
                    <TagsEmpty>
                      {newTag.trim() &&
                        !tags.some(
                          (t) =>
                            t.id ===
                              newTag.toLowerCase().replace(/\s+/g, "-") ||
                            t.label.toLowerCase() === newTag.toLowerCase(),
                        ) && (
                          <button
                            className="mx-auto flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
                            onClick={handleCreateTag}
                            type="button"
                          >
                            <PlusIcon
                              className="text-muted-foreground"
                              size={14}
                            />
                            Create new tag: {newTag}
                          </button>
                        )}
                    </TagsEmpty>
                    <TagsGroup>
                      {tags.map((tag) => (
                        <TagsItem
                          key={tag.id}
                          onSelect={handleSelect}
                          value={tag.id}
                        >
                          {tag.label}
                          {selected.includes(tag.id) && (
                            <CheckIcon
                              className="text-muted-foreground"
                              size={14}
                            />
                          )}
                        </TagsItem>
                      ))}
                    </TagsGroup>
                  </TagsList>
                </TagsContent>
              </Tags>
            </div>

            {/* Project Manager */}
            <div className="space-y-2">
              <Label htmlFor="project-manager" className="text-sm font-medium">
                Project Manager <span className="text-destructive">*</span>
              </Label>
              <Combobox
                data={userOptions}
                type="Project Manager"
                value={projectManager}
                onValueChange={setProjectManager}
              >
                <ComboboxTrigger
                  className="w-full"
                  disabled={updateProjectMutation.isPending}
                />
                <ComboboxContent>
                  <ComboboxInput />
                  <ComboboxEmpty />
                  <ComboboxList>
                    <ComboboxGroup>
                      {userOptions.map((user) => (
                        <ComboboxItem key={user.value} value={user.value}>
                          {user.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-sm font-medium">
                Customer <span className="text-destructive">*</span>
              </Label>
              <Combobox
                data={customerOptions}
                type="customer"
                value={customer}
                onValueChange={setCustomer}
              >
                <ComboboxTrigger
                  className="w-full"
                  disabled={updateProjectMutation.isPending}
                />
                <ComboboxContent>
                  <ComboboxInput />
                  <ComboboxEmpty />
                  <ComboboxList>
                    <ComboboxGroup>
                      {customerOptions.map((customerOption) => (
                        <ComboboxItem
                          key={customerOption.value}
                          value={customerOption.value}
                        >
                          {customerOption.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start Date
              </Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="start-date"
                    className="w-full justify-between font-normal"
                    disabled={updateProjectMutation.isPending}
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
                        : "Select date"}
                    </span>
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    captionLayout="dropdown"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-sm font-medium">
                Deadline
              </Label>
              <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="deadline"
                    className="w-full justify-between font-normal"
                    disabled={updateProjectMutation.isPending}
                  >
                    <span
                      className={
                        deadline ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {deadline
                        ? deadline.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select date"}
                    </span>
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    captionLayout="dropdown"
                    disabled={(date) => {
                      if (startDate) {
                        const minDate = new Date(startDate);
                        minDate.setHours(0, 0, 0, 0);
                        return date < minDate;
                      }
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    onSelect={(date) => {
                      setDeadline(date);
                      setDeadlineOpen(false);
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
                onValueChange={(value) => setStatus(value as ProjectStatusEnum)}
              >
                <ComboboxTrigger
                  className="w-full"
                  disabled={updateProjectMutation.isPending}
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Type your description here..."
                className="resize-none min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={updateProjectMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending
                ? "Updating..."
                : "Update Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
