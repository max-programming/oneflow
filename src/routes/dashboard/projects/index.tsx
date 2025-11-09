import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProjectsPaginatedFn } from "@/server/projects";
import { ProjectFiltersBar } from "@/components/project-filters-bar";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProjectCard,
  ProjectCardSkeleton,
  type Project,
} from "@/components/project-card";
import {
  ProjectsListTable,
  ProjectsListTableSkeleton,
} from "@/components/projects-list-table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import z from "zod";

const searchParamsSchema = z.object({
  query: z.string().optional(),
  manager: z.string().optional(),
  customer: z.string().optional(),
  status: z
    .enum([
      "all",
      "in-progress",
      "waiting-to-start",
      "completed",
      "cancelled",
      "on-hold",
    ])
    .optional(),
  startDate: z.iso.date().optional(),
  deadlineDate: z.iso.date().optional(),
  tags: z.array(z.string()).optional(),
});

export type ProjectsPageSP = z.infer<typeof searchParamsSchema>;

export const Route = createFileRoute("/dashboard/projects/")({
  validateSearch: searchParamsSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // State for managing edit/delete dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  function handleFiltersChange(newFilters: ProjectsPageSP) {
    navigate({
      to: "/dashboard/projects",
      search: (prev) => {
        return {
          ...prev,
          ...newFilters,
        };
      },
      replace: true,
    });
  }

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
    queryKey: ["projects", "infinite", searchParams],
    queryFn: ({ pageParam }) =>
      getProjectsPaginatedFn({
        data: {
          cursor: pageParam,
          limit: 12,
          query: searchParams.query,
          manager: searchParams.manager,
          customer: searchParams.customer,
          status: searchParams.status,
          startDate: searchParams.startDate,
          deadlineDate: searchParams.deadlineDate,
          tags: searchParams.tags,
        },
      }),
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
      {/* Edit Dialog */}
      {selectedProject && (
        <EditProjectDialog
          project={selectedProject}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog */}
      <DeleteProjectDialog
        project={selectedProject}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

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

          {/* Project Filters */}
          <ProjectFiltersBar
            query={searchParams.query}
            manager={searchParams.manager}
            customer={searchParams.customer}
            status={searchParams.status || "all"}
            startDate={searchParams.startDate}
            deadlineDate={searchParams.deadlineDate}
            tags={searchParams.tags}
            onFiltersChange={handleFiltersChange}
          />

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
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
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
