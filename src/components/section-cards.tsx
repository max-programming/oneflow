import {
  IconAlertTriangle,
  IconBriefcase,
  IconChecklist,
  IconClock,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionCardsProps {
  statistics?: {
    totalProjects: number;
    activeProjects: number;
    projectsNearingDeadline: number;
    overdueProjects: number;
  };
  isLoading?: boolean;
}

export function SectionCards({ statistics, isLoading }: SectionCardsProps) {
  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  const stats = statistics || {
    totalProjects: 0,
    activeProjects: 0,
    projectsNearingDeadline: 0,
    overdueProjects: 0,
  };

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalProjects}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <IconBriefcase className="size-4" />
              Managed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Projects under your management
          </div>
          <div className="text-muted-foreground">
            All active and completed projects
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.activeProjects}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="gap-1">
              <IconChecklist className="size-4" />
              In Progress
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Currently in progress
          </div>
          <div className="text-muted-foreground">
            Projects actively being worked on
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Nearing Deadline</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.projectsNearingDeadline}
          </CardTitle>
          <CardAction>
            <Badge
              variant={
                stats.projectsNearingDeadline > 0 ? "default" : "outline"
              }
              className="gap-1"
            >
              <IconClock className="size-4" />
              Next 7 Days
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.projectsNearingDeadline > 0
              ? "Requires attention"
              : "No urgent deadlines"}
          </div>
          <div className="text-muted-foreground">
            Projects due within a week
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Overdue Projects</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.overdueProjects}
          </CardTitle>
          <CardAction>
            <Badge
              variant={stats.overdueProjects > 0 ? "destructive" : "outline"}
              className="gap-1"
            >
              <IconAlertTriangle className="size-4" />
              {stats.overdueProjects > 0 ? "Action Needed" : "On Track"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.overdueProjects > 0
              ? "Immediate attention required"
              : "All projects on schedule"}
          </div>
          <div className="text-muted-foreground">
            Projects past their deadline
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
