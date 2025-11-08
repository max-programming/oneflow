import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Building2, Tag } from "lucide-react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProjectsFn } from "@/server/projects";

type Projects = Awaited<ReturnType<typeof getProjectsFn>>;
export type Project = Projects[number];

// Helper function to get status badge variant
function getStatusVariant(status: string) {
  switch (status) {
    case "in-progress":
      return "default";
    case "completed":
      return "default";
    case "waiting-to-start":
      return "outline";
    case "cancelled":
      return "destructive";
    case "on-hold":
      return "secondary";
    default:
      return "outline";
  }
}

// Helper function to format status text
function formatStatus(status: string) {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to format date
function formatDate(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "Not set";
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

// Project Card Component
export function ProjectCard({
  project,
  isAdminOrProjectManager,
}: {
  project: Project;
  isAdminOrProjectManager: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description || "No description"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isAdminOrProjectManager && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="data-[state=open]:bg-muted text-muted-foreground h-8 w-8 p-0"
                    size="icon"
                  >
                    <IconDotsVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <IconPencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <IconTrash className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <Badge variant={getStatusVariant(project.status)}>
          {formatStatus(project.status)}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="space-y-2 text-sm">
          {project.managerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                <span className="font-medium">Manager:</span>{" "}
                {project.managerName}
              </span>
            </div>
          )}
          {project.customerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                <span className="font-medium">Customer:</span>{" "}
                {project.customerName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              <span className="font-medium">Start:</span>{" "}
              {formatDate(project.startDate)}
            </span>
          </div>
          {project.deadlineDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                <span className="font-medium">Deadline:</span>{" "}
                {formatDate(project.deadlineDate)}
              </span>
            </div>
          )}
        </div>
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {project.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Created {formatDate(project.createdAt)}
      </CardFooter>
    </Card>
  );
}
