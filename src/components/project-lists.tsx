import { IconAlertTriangle, IconClock, IconHistory } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/project-card";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  managerId: string;
  managerName: string | null;
  managerEmail: string | null;
  managerRole: string | null;
  startDate: string | null;
  deadlineDate: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectListsProps {
  urgentProjects?: Project[];
  overdueProjects?: Project[];
  recentProjects?: Project[];
  isLoading?: boolean;
}

export function ProjectLists({
  urgentProjects,
  overdueProjects,
  recentProjects,
  isLoading,
}: ProjectListsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <Skeleton key={cardIndex} className="h-48" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const urgent = urgentProjects || [];
  const overdue = overdueProjects || [];
  const recent = recentProjects || [];

  return (
    <div className="space-y-6">
      {/* Overdue Projects */}
      {overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <IconAlertTriangle className="size-5" />
              Overdue Projects
            </CardTitle>
            <CardDescription>
              Projects that have passed their deadline and require immediate
              attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {overdue.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdminOrProjectManager={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgent Projects */}
      {urgent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconClock className="size-5" />
              Projects Nearing Deadline
            </CardTitle>
            <CardDescription>
              Projects due within the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {urgent.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdminOrProjectManager={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Projects */}
      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconHistory className="size-5" />
              Recently Updated Projects
            </CardTitle>
            <CardDescription>
              Projects with recent activity for quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recent.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdminOrProjectManager={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {urgent.length === 0 && overdue.length === 0 && recent.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No projects to display. Create your first project to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
