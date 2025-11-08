import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Assignee {
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

interface AssigneeAvatarsProps {
  assignees: Assignee[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string | null): string {
  if (!name) return "?";

  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

function getAvatarColor(name: string | null): string {
  if (!name) return "bg-gray-200 text-gray-700";

  const colors = [
    "bg-blue-200 text-blue-700",
    "bg-green-200 text-green-700",
    "bg-yellow-200 text-yellow-800",
    "bg-purple-200 text-purple-700",
    "bg-pink-200 text-pink-700",
    "bg-indigo-200 text-indigo-700",
    "bg-red-200 text-red-700",
    "bg-orange-200 text-orange-700",
  ];

  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function AssigneeAvatars({
  assignees,
  maxDisplay = 3,
  size = "md",
}: AssigneeAvatarsProps) {
  const displayedAssignees = assignees.slice(0, maxDisplay);
  const remainingCount = assignees.length - maxDisplay;

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  if (assignees.length === 0) {
    return <span className="text-sm text-muted-foreground">No assignees</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {displayedAssignees.map((assignee) => (
          <Tooltip key={assignee.userId}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border-2 border-background ring-1 ring-border",
                )}
              >
                <AvatarFallback
                  className={cn(
                    getAvatarColor(assignee.userName),
                    "font-semibold",
                  )}
                >
                  {getInitials(assignee.userName)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {assignee.userName || "Unknown"}
                </p>
                {assignee.userEmail && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {assignee.userEmail}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border-2 border-background ring-1 ring-border bg-muted",
                )}
              >
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {remainingCount} more assignee{remainingCount > 1 ? "s" : ""}
                </p>
                {assignees.slice(maxDisplay).map((assignee) => (
                  <p
                    key={assignee.userId}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    {assignee.userName || "Unknown"}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
