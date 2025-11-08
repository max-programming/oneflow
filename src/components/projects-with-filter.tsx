import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getFilteredProjectsFn,
  getTeamMemberFilteredProjectsFn,
  getAdminFilteredProjectsFn,
} from "@/server/projects";
import { ProjectCard } from "./project-card";
import { Pagination } from "./ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "./ui/skeleton";
import { Card } from "./ui/card";
import { useRouteContext } from "@tanstack/react-router";

type FilterType =
  | "all"
  | "overdue"
  | "nearing"
  | "active"
  | "completed"
  | "on-hold";

const filterLabels: Record<FilterType, string> = {
  all: "All Projects",
  overdue: "Overdue",
  nearing: "Nearing Deadline",
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
};

interface ProjectsWithFilterProps {
  userRole?: "project-manager" | "team-member" | "admin" | "sales-finance";
}

export function ProjectsWithFilter({
  userRole = "project-manager",
}: ProjectsWithFilterProps) {
  const { session } = useRouteContext({ from: "__root__" });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filter, setFilter] = React.useState<FilterType>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: [
      userRole === "team-member"
        ? "tm-filtered-projects"
        : userRole === "admin" || userRole === "sales-finance"
          ? "admin-filtered-projects"
          : "filtered-projects",
      currentPage,
      filter,
    ],
    queryFn: () => {
      if (userRole === "team-member") {
        return getTeamMemberFilteredProjectsFn({
          data: {
            page: currentPage,
            limit: 6,
            filter,
          },
        });
      } else if (userRole === "admin" || userRole === "sales-finance") {
        return getAdminFilteredProjectsFn({
          data: {
            page: currentPage,
            limit: 6,
            filter,
          },
        });
      } else {
        return getFilteredProjectsFn({
          data: {
            page: currentPage,
            limit: 6,
            filter,
          },
        });
      }
    },
  });

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const isAdminOrProjectManager =
    session?.user?.role === "admin" ||
    session?.user?.role === "project-manager";

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">
          Error loading projects: {error.message}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          {data && (
            <p className="text-sm text-muted-foreground">
              Showing {data.projects.length} of {data.pagination.totalCount}{" "}
              projects
            </p>
          )}
        </div>

        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {filterLabels[filter]}
              {data && data.counts[filter] > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({data.counts[filter]})
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(filterLabels) as FilterType[]).map((filterKey) => (
              <SelectItem key={filterKey} value={filterKey}>
                <div className="flex items-center justify-between gap-4">
                  <span>{filterLabels[filterKey]}</span>
                  {data && (
                    <span className="text-muted-foreground">
                      ({data.counts[filterKey]})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : data && data.projects.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isAdminOrProjectManager={isAdminOrProjectManager}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={data.pagination.currentPage}
                totalPages={data.pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {filter === "all"
                ? "You don't have any projects yet."
                : `No ${filterLabels[filter].toLowerCase()} projects found.`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
