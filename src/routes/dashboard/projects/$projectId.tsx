import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  Users,
  Target,
  Tag,
  Building2,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProjectByIdFn } from "@/server/projects";

export const Route = createFileRoute("/dashboard/projects/$projectId")({
  component: RouteComponent,
});

// Skeleton Loading Component
function ProjectDetailsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-4">
            {/* Header Skeleton */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-8 w-80" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-8 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            {/* Progress Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <div className="flex space-x-1 rounded-lg bg-muted p-1">
              {[...Array(11)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Overview Card */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Skeleton className="h-px w-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>

                {/* Project Leads Card */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Skeleton */}
              <div className="space-y-6">
                {/* Stats Card */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </CardContent>
                </Card>

                {/* Hours Chart Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-2">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { projectId } = Route.useParams();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByIdFn({ data: { projectId } }),
  });

  if (isLoading) {
    return <ProjectDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-destructive">
                Error loading project
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Failed to load project details"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold">Project not found</p>
              <p className="text-sm text-muted-foreground">
                The project you're looking for doesn't exist or you don't have
                access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TODO: These fields are not available from the API yet, using dummy data
  // Add these to the backend API and remove dummy data when available
  const dummyEnhancements = {
    progress: 93.65, // TODO: Calculate from project tasks completion
    totalLoggedHours: "5153:07", // TODO: Add time tracking system
    openTasks: 23, // TODO: Count from projectTasks table
    totalTasks: 362, // TODO: Count from projectTasks table
    totalDays: 407, // TODO: Calculate from start date and deadline
    customer: {
      // API provides customerName, but missing email
      name: project.customerName || "Unknown Customer",
      email: "contact@enacton.com", // TODO: Add customer email to API response
    },
    trackedByPM: false, // TODO: Add this field to projects table
    staffCanCreateTasks: true, // TODO: Add this field to projects table
    leads: {
      // TODO: Add project leads to database schema
      qa: "Sakib Lakhani",
      tech: "Preetham Chandra",
      pm: project.managerName || "Unknown Manager",
      superIncharge: "Ovesh Dhanga",
    },
    weeklyHours: [
      // TODO: Implement time tracking and weekly hours calculation
      { day: "Monday", hours: 8.5 },
      { day: "Tuesday", hours: 7.2 },
      { day: "Wednesday", hours: 9.1 },
      { day: "Thursday", hours: 8.7 },
      { day: "Friday", hours: 6.8 },
      { day: "Saturday", hours: 0 },
      { day: "Sunday", hours: 0 },
    ],
  };

  // Merge API data with dummy enhancements
  const projectData = {
    ...project,
    daysLeft: project.deadlineDate
      ? new Date(project.deadlineDate).getTime() - new Date().getTime()
      : 0,
    ...dummyEnhancements,
    // Override customer with API data where available
    customer: {
      name: project.customerName || dummyEnhancements.customer.name,
      email: dummyEnhancements.customer.email, // TODO: Get from API
    },
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 lg:px-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-4">
            {/* Project Title and Team */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {projectData.name}
                  </h1>
                  <Badge variant="secondary" className="capitalize">
                    {projectData.status.replace("-", " ")}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm">+ New Task</Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Project Progress</span>
                <span className="text-muted-foreground">
                  {projectData.progress}%
                </span>
              </div>
              <Progress value={projectData.progress} className="h-2" />
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-11">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Overview */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Building2 className="h-4 w-4" />
                              Project #
                            </div>
                            <span className="text-sm">{projectData.id}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Target className="h-4 w-4" />
                              Status
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {projectData.status.replace("-", " ")}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Calendar className="h-4 w-4" />
                              Start Date
                            </div>
                            <span className="text-sm">
                              {projectData.startDate || "Not set"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Clock className="h-4 w-4" />
                              Total Logged Hours
                            </div>
                            <span className="text-sm">
                              {projectData.totalLoggedHours}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Users className="h-4 w-4" />
                              Staff Create Task?
                            </div>
                            <Badge
                              variant={
                                projectData.staffCanCreateTasks
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {projectData.staffCanCreateTasks ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium min-w-24">
                              Customer
                            </div>
                            <span className="text-sm text-blue-600">
                              {projectData.customer.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium min-w-24">
                              Date Created
                            </div>
                            <span className="text-sm">
                              {projectData.createdAt
                                ? new Date(
                                    projectData.createdAt,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium min-w-24">
                              Deadline
                            </div>
                            <span className="text-sm">
                              {projectData.deadlineDate || "Not set"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium min-w-24">
                              Tracked by PM
                            </div>
                            <Badge
                              variant={
                                projectData.trackedByPM
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {projectData.trackedByPM ? "Yes" : "No"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium min-w-24">
                              <Tag className="h-4 w-4" />
                              Tags
                            </div>
                            <div className="flex gap-1">
                              {projectData.tags &&
                              projectData.tags.length > 0 ? (
                                projectData.tags.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No tags
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Description
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {projectData.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project Leads */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Project Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Lead QA</span>
                        <span className="text-sm">{projectData.leads.qa}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Lead Tech</span>
                        <span className="text-sm">
                          {projectData.leads.tech}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Lead PM</span>
                        <span className="text-sm">{projectData.leads.pm}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Super Incharge
                        </span>
                        <span className="text-sm">
                          {projectData.leads.superIncharge}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Project Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {projectData.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>
                            {projectData.openTasks} / {projectData.totalTasks}{" "}
                            Open Tasks
                          </span>
                          <span className="font-medium">
                            {projectData.progress}%
                          </span>
                        </div>
                        <Progress
                          value={projectData.progress}
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>
                            {projectData.daysLeft} / {projectData.totalDays}{" "}
                            Days Left
                          </span>
                          <span className="font-medium">
                            {(
                              (projectData.daysLeft / projectData.totalDays) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            (projectData.daysLeft / projectData.totalDays) * 100
                          }
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Hours Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Clock className="h-4 w-4" />
                          Total Logged Hours
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs">
                          This Week
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>Logged Hours</span>
                        </div>

                        <div className="space-y-2">
                          {projectData.weeklyHours.map((day) => (
                            <div
                              key={day.day}
                              className="flex items-center gap-2"
                            >
                              <div className="text-xs text-muted-foreground min-w-16 text-right">
                                {day.hours.toFixed(1)}h
                              </div>
                              <div className="flex-1">
                                <div className="h-8 bg-muted rounded-sm overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{
                                      width: `${(day.hours / 10) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground min-w-16">
                                {day.day.slice(0, 3)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Placeholder for other tabs */}
            <TabsContent value="tasks">
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">
                    Tasks view coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timesheets">
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">
                    Timesheets view coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add similar placeholders for other tabs */}
            <TabsContent value="discussions">
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground capitalize">
                    Discussions view coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
