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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Calendar,
  User,
  Building2,
  Tag,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { getProjectsFn } from "@/server/projects";
import { Link } from "@tanstack/react-router";

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
  onEdit,
  onDelete,
}: {
  project: Project;
  isAdminOrProjectManager: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}) {
  return (
    <DropdownMenu>
      <Link
        to="/dashboard/projects/PRJ-{$projectId}"
        params={{ projectId: project.id.toString() }}
        className="block"
      >
        <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] cursor-pointer group">
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
                  <>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="data-[state=open]:bg-muted text-muted-foreground h-8 w-8 p-0"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <IconDotsVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </>
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
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.managerName}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold">
                              {project.managerName}
                            </h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            {project.managerEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {project.managerEmail}
                                </span>
                              </div>
                            )}
                            {project.managerRole && (
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  {project.managerRole
                                    .split("-")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </span>
                </div>
              )}
              {project.customerName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    <span className="font-medium">Customer:</span>{" "}
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.customerName}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold">
                              {project.customerName}
                            </h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            {project.customerEmail && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {project.customerEmail}
                                </span>
                              </div>
                            )}
                            {project.customerPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {project.customerPhone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
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
            {/* Task Progress */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Task Progress</span>
                <span className="text-xs font-medium">
                  {project.completedTasks || 0} / {project.totalTasks || 0}{" "}
                  tasks
                </span>
              </div>
              <Progress
                value={
                  project.totalTasks && project.totalTasks > 0
                    ? (project.completedTasks / project.totalTasks) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Created {formatDate(project.createdAt)}
          </CardFooter>
        </Card>
      </Link>
      {isAdminOrProjectManager && (
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(project);
            }}
          >
            <IconPencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(project);
            }}
          >
            <IconTrash className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

// Loading Skeleton Component
export function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}
