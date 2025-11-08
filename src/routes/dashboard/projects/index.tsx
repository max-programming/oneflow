import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useQuery } from "@tanstack/react-query";
import { getProjectsFn } from "@/server/projects";
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
import { Calendar, User, Building2, Tag } from "lucide-react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Projects = Awaited<ReturnType<typeof getProjectsFn>>;
type Project = Projects[number];

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
function ProjectCard({
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

// Loading Skeleton Component
function ProjectCardSkeleton() {
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

export const Route = createFileRoute("/dashboard/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdminOrProjectManager =
    session?.user?.role === "admin" ||
    session?.user?.role === "project-manager";

  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjectsFn(),
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
              <p className="text-muted-foreground">
                View and manage all your projects
              </p>
            </div>
            {isAdminOrProjectManager && (
              <CreateProjectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                triggerButton={
                  <Button className="absolute top-6 right-6" variant="default">
                    Create Project
                  </Button>
                }
              />
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">
                  Error loading projects: {error.message}
                </p>
              </CardContent>
            </Card>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdminOrProjectManager={isAdminOrProjectManager}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No projects found. Create your first project to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
