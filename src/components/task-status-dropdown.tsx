import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  IconChecklist,
  IconPlayerPlay,
  IconPlayerPause,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { TaskStatusEnum } from "@/db/schema";

interface TaskStatusDropdownProps {
  status: TaskStatusEnum;
  onChange: (status: TaskStatusEnum) => void;
  disabled?: boolean;
}

const statusConfig = {
  "waiting-to-start": {
    label: "Waiting to Start",
    icon: IconChecklist,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  "in-progress": {
    label: "In Progress",
    icon: IconPlayerPlay,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  stuck: {
    label: "Stuck",
    icon: IconPlayerPause,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  done: {
    label: "Done",
    icon: IconCircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
} as const;

export function TaskStatusDropdown({
  status,
  onChange,
  disabled = false,
}: TaskStatusDropdownProps) {
  const config = statusConfig[status] || statusConfig["waiting-to-start"];
  const Icon = config.icon;

  return (
    <Select
      value={status}
      onValueChange={(value) => onChange(value as TaskStatusEnum)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-[160px] h-auto border-0 focus:ring-0 px-2 py-1 rounded-md",
          config.bgColor,
          config.color,
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          <span>{config.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(statusConfig) as TaskStatusEnum[]).map((statusKey) => {
          const config = statusConfig[statusKey];
          const Icon = config.icon;

          return (
            <SelectItem key={statusKey} value={statusKey}>
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", config.color)} />
                <span>{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
