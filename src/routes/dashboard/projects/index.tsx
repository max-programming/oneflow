import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useQuery } from "@tanstack/react-query";
import { getProjectsFn } from "@/server/projects";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";

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
                  <Button variant="default">Create Project</Button>
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
