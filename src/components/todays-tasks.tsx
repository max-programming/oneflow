import {
  IconCalendar,
  IconUser,
  IconBriefcase,
  IconMail,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TodaysTasksProps {
  tasks?: Array<{
    taskId: string;
    taskName: string;
    taskDescription: string | null;
    taskStartDate: string;
    taskDueDate: string;
    projectId: string;
    projectName: string;
    projectStatus: string;
    assignees: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      userRole: string;
    }>;
  }>;
  isLoading?: boolean;
}

export function TodaysTasks({ tasks, isLoading }: TodaysTasksProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskList = tasks || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendar className="size-5" />
          Today's Tasks
        </CardTitle>
        <CardDescription>
          Tasks due today across all your projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        {taskList.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <IconCalendar className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No tasks due today</h3>
            <p className="text-sm text-muted-foreground">
              You're all caught up! No tasks are scheduled for completion today.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {taskList.map((task) => (
              <div
                key={task.taskId}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold leading-none">
                        {task.taskName}
                      </h4>
                      {task.taskDescription && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {task.taskDescription}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className="gap-1">
                        <IconBriefcase className="size-3" />
                        {task.projectName}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        {task.projectStatus
                          .split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                      </Badge>
                    </div>

                    {task.assignees.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Assigned to:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {task.assignees.map((assignee) => (
                            <div
                              key={assignee.userId}
                              className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5"
                            >
                              <Avatar className="size-6">
                                <AvatarFallback className="text-xs">
                                  {assignee.userName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium leading-none">
                                  {assignee.userName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {assignee.userRole
                                    .split("-")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")}
                                </span>
                              </div>
                              {assignee.userEmail && (
                                <a
                                  href={`mailto:${assignee.userEmail}`}
                                  className="ml-2 text-muted-foreground transition-colors hover:text-foreground"
                                  title={`Email ${assignee.userName}`}
                                >
                                  <IconMail className="size-4" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
