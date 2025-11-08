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
import {
  createFileRoute,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRight,
  PlusIcon,
} from "lucide-react";
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
import { useState } from "react";
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
import { createProjectFn, getProjectManagersFn } from "@/server/projects";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

export const Route = createFileRoute("/dashboard/projects/")({
    component: RouteComponent,
});

function RouteComponent() {
    const location = useLocation();
  const navigate = useNavigate();
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectManager, setProjectManager] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [status, setStatus] = useState<string>("waiting-to-start");
  const [projectName, setProjectName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Fetch project managers and customers
  const { data: projectManagersData } = useQuery({
    queryKey: ["project-managers"],
    queryFn: () => getProjectManagersFn(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomersFn(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRemove = (value: string) => {
    if (!selected.includes(value)) {
      return;
    }
    console.log(`removed: ${value}`);
    setSelected((prev) => prev.filter((v) => v !== value));
  };
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      handleRemove(value);
      return;
    }
    console.log(`selected: ${value}`);
    setSelected((prev) => [...prev, value]);
  };
  const handleCreateTag = () => {
    if (!newTag.trim()) return;
    console.log(`created: ${newTag}`);
    setTags((prev) => [
      ...prev,
      {
        id: newTag.toLowerCase().replace(/\s+/g, "-"),
        label: newTag,
      },
    ]);
    setSelected((prev) => [...prev, newTag.toLowerCase().replace(/\s+/g, "-")]);
    setNewTag("");
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    return { segment, path };
  });

  return (
    <div className="relative p-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        
          <DialogTrigger asChild>
            <Button className="absolute top-6 right-6" variant="default">
            Create Project
        </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="space-y-3 border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {breadcrumbItems.map((item, index) => (
                    <div key={item.path} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="size-3.5" />}
                      <Link
                        to={item.path}
                        className={`capitalize transition-colors hover:text-foreground ${
                          index === breadcrumbItems.length - 1
                            ? "text-foreground font-medium"
                            : "cursor-pointer"
                        }`}
                        onClick={(e) => {
                          if (index < breadcrumbItems.length - 1) {
                            e.preventDefault();
                            navigate({ to: item.path });
                            setDialogOpen(false);
                          }
                        }}
                      >
                        {item.segment === "dashboard"
                          ? "Dashboard"
                          : item.segment}
                      </Link>
                    </div>
                  ))}
                  <ChevronRight className="size-3.5" />
                  <span className="text-foreground font-medium">
                                Create Project
                  </span>
                </div>
                            </div>
              <DialogTitle className="text-left text-2xl font-semibold">
                Create New Project
              </DialogTitle>
          </DialogHeader>
          <form
          onSubmit={async (e) => {
            e.preventDefault();
            console.log({projectManager, projectName, customer});
            // Validate required fields
            if (!projectName.trim()) {
              return;
            }
            if (!projectManager) {
              return;
            }
            if (!customer) {
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

            setIsSubmitting(true);
            try {
              await createProjectFn({
                data: {
                  name: projectName.trim(),
                  description: description.trim() || undefined,
                  status: status as "in-progress" | "waiting-to-start" | "completed" | "cancelled" | "on-hold",
                  managerId: projectManager,
                  customerId: customer,
                  startDate: formattedStartDate,
                  deadlineDate: formattedDeadlineDate,
                  tags: tagLabels,
                },
              });
              
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              setDialogOpen(false);
              // Reset form
              setProjectName("");
              setDescription("");
              setSelected([]);
              setProjectManager("");
              setCustomer("");
              setStatus("waiting-to-start");
              setStartDate(undefined);
              setDeadline(undefined);
            } catch (error) {
              console.error("Failed to create project:", error);
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
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
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="project-tags" className="text-sm font-medium">
                  Tags
                </Label>
                <Tags className="w-full">
                  <TagsTrigger>
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
                <Label
                  htmlFor="project-manager"
                  className="text-sm font-medium"
                >
                  Project Manager <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  data={userOptions}
                  type="Project Manager"
                  value={projectManager}
                  onValueChange={setProjectManager}
                >
                  <ComboboxTrigger className="w-full" />
                  <ComboboxContent>
                    <ComboboxInput />
                    <ComboboxEmpty />
                    <ComboboxList>
                      <ComboboxGroup>
                        {userOptions.map((user) => (
                          <ComboboxItem
                            key={user.value}
                            value={user.value}
                          >
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
                  <ComboboxTrigger className="w-full" />
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
                    >
                      <span
                        className={
                          startDate
                            ? "text-foreground"
                            : "text-muted-foreground"
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
                  onValueChange={setStatus}
                >
                  <ComboboxTrigger className="w-full" />
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
                />
            </div>
          </div>

            <DialogFooter className="border-t pt-4 gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline">
                  Discard
                </Button>
            </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Project"}
              </Button>
          </DialogFooter>
      </form>
        </DialogContent>
    </Dialog>
    </div>
  );
}
