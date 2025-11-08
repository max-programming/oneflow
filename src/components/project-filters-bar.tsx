import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCustomersFn } from "@/server/customer";
import { getProjectManagersFn } from "@/server/projects";
import { useState, useEffect } from "react";
import type { ProjectsPageSP } from "@/routes/dashboard/projects";

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

interface ProjectFiltersBarProps {
  query?: string;
  manager?: string;
  customer?: string;
  status?: string;
  startDate?: string;
  deadlineDate?: string;
  tags?: string[];
  onFiltersChange: (filters: ProjectsPageSP) => void;
}

export function ProjectFiltersBar({
  query = "",
  manager = "",
  customer = "",
  status = "all",
  startDate,
  deadlineDate,
  tags = [],
  onFiltersChange,
}: ProjectFiltersBarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [deadlineDateOpen, setDeadlineDateOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [availableTags] = useState(defaultTags);

  // Fetch project managers and customers
  const { data: projectManagersData } = useQuery({
    queryKey: ["project-managers"],
    queryFn: () => getProjectManagersFn(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomersFn(),
  });

  // Format options for comboboxes
  const managerOptions =
    projectManagersData?.map((pm) => ({
      value: pm.id,
      label: pm.name,
    })) || [];

  const customerOptions =
    customersData?.map((cust) => ({
      value: cust.id,
      label: cust.name,
    })) || [];

  // Debounced query update
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localQuery !== query) {
        onFiltersChange({ query: localQuery });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [localQuery, query, onFiltersChange]);

  const handleManagerChange = (value: string) => {
    onFiltersChange({ manager: value || undefined });
  };

  const handleCustomerChange = (value: string) => {
    onFiltersChange({ customer: value || undefined });
  };

  const handleStatusChange = (value: ProjectsPageSP["status"]) => {
    onFiltersChange({ status: value });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onFiltersChange({
      startDate: date ? date.toISOString().split("T")[0] : undefined,
    });
    setStartDateOpen(false);
  };

  const handleDeadlineDateChange = (date: Date | undefined) => {
    onFiltersChange({
      deadlineDate: date ? date.toISOString().split("T")[0] : undefined,
    });
    setDeadlineDateOpen(false);
  };

  const handleTagSelect = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    onFiltersChange({ tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleTagRemove = (tagId: string) => {
    const newTags = selectedTags.filter((t) => t !== tagId);
    setSelectedTags(newTags);
    onFiltersChange({ tags: newTags.length > 0 ? newTags : undefined });
  };

  const clearAllFilters = () => {
    setLocalQuery("");
    setSelectedTags([]);
    onFiltersChange({
      query: undefined,
      manager: undefined,
      customer: undefined,
      status: "all",
      startDate: undefined,
      deadlineDate: undefined,
      tags: undefined,
    });
  };

  const hasActiveFilters =
    localQuery ||
    manager ||
    customer ||
    (status && status !== "all") ||
    startDate ||
    deadlineDate ||
    selectedTags.length > 0;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2 lg:px-3"
          >
            Clear all
            <X className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Primary Filters Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search Query */}
          <div className="space-y-2">
            <Label htmlFor="search-query" className="text-xs">
              Search
            </Label>
            <Input
              id="search-query"
              placeholder="Search projects..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={status}
              onValueChange={(v) =>
                handleStatusChange(v as ProjectsPageSP["status"])
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="waiting-to-start">
                  Waiting to Start
                </SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">Tags</Label>
            <Tags className="w-full">
              <TagsTrigger className="h-9">
                {selectedTags.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  return tag ? (
                    <TagsValue
                      key={tagId}
                      onRemove={() => handleTagRemove(tagId)}
                    >
                      {tag.label}
                    </TagsValue>
                  ) : null;
                })}
              </TagsTrigger>
              <TagsContent className="w-full">
                <TagsInput placeholder="Search tags..." />
                <TagsList>
                  <TagsEmpty>No tags found</TagsEmpty>
                  <TagsGroup>
                    {availableTags.map((tag) => (
                      <TagsItem
                        key={tag.id}
                        onSelect={handleTagSelect}
                        value={tag.id}
                        disabled={selectedTags.includes(tag.id)}
                      >
                        {tag.label}
                      </TagsItem>
                    ))}
                  </TagsGroup>
                </TagsList>
              </TagsContent>
            </Tags>
          </div>
        </div>

        {/* Secondary Filters Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Manager Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Manager</Label>
            <Combobox
              data={managerOptions}
              type="manager"
              value={manager}
              onValueChange={handleManagerChange}
            >
              <ComboboxTrigger className="h-9 w-full" />
              <ComboboxContent>
                <ComboboxInput />
                <ComboboxEmpty />
                <ComboboxList>
                  <ComboboxGroup>
                    <ComboboxItem value="">All Managers</ComboboxItem>
                    {managerOptions.map((option) => (
                      <ComboboxItem key={option.value} value={option.value}>
                        {option.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Customer Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Customer</Label>
            <Combobox
              data={customerOptions}
              type="customer"
              value={customer}
              onValueChange={handleCustomerChange}
            >
              <ComboboxTrigger className="h-9 w-full" />
              <ComboboxContent>
                <ComboboxInput />
                <ComboboxEmpty />
                <ComboboxList>
                  <ComboboxGroup>
                    <ComboboxItem value="">All Customers</ComboboxItem>
                    {customerOptions.map((option) => (
                      <ComboboxItem key={option.value} value={option.value}>
                        {option.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Start Date Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Start Date After</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Deadline Date Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Deadline Before</Label>
            <Popover open={deadlineDateOpen} onOpenChange={setDeadlineDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    !deadlineDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {deadlineDate ? format(deadlineDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadlineDate ? new Date(deadlineDate) : undefined}
                  onSelect={handleDeadlineDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
