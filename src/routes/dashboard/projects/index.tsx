import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProjectsPaginatedFn } from "@/server/projects";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard, ProjectCardSkeleton } from "@/components/project-card";
import {
  ProjectsListTable,
  ProjectsListTableSkeleton,
} from "@/components/projects-list-table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isAdminOrProjectManager =
    session?.user?.role === "admin" ||
    session?.user?.role === "project-manager";

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["projects", "infinite"],
    queryFn: ({ pageParam }) =>
      getProjectsPaginatedFn({ data: { cursor: pageParam, limit: 12 } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const projects = data?.pages.flatMap((page) => page.projects) ?? [];

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isFetching]);

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
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => {
                  if (value) setViewMode(value as "card" | "list");
                }}
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
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
          </div>

          {isLoading ? (
            viewMode === "card" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ProjectCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <ProjectsListTableSkeleton />
            )
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">
                  Error loading projects: {error.message}
                </p>
              </CardContent>
            </Card>
          ) : projects && projects.length > 0 ? (
            viewMode === "card" ? (
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
              <ProjectsListTable
                projects={projects}
                isAdminOrProjectManager={isAdminOrProjectManager}
              />
            )
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No projects found. Create your first project to get started.
                </p>
              </CardContent>
            </Card>
          )}

          {projects.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more projects...</span>
                </div>
              ) : hasNextPage ? (
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  Load More
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No more projects to load
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
