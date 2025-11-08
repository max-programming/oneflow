import {
  IconCalendar,
  IconUser,
  IconBriefcase,
  IconMail,
  IconAlertCircle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

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
  const [visibleTasks, setVisibleTasks] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const taskList = tasks || [];

  // Helper function to check if a task is overdue
  const isTaskOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDue = new Date(dueDate);
    taskDue.setHours(0, 0, 0, 0);
    return taskDue < today;
  };

  // Load more tasks function
  const loadMoreTasks = () => {
    if (visibleTasks >= taskList.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleTasks((prev) => Math.min(prev + 5, taskList.length));
      setIsLoadingMore(false);
    }, 300);
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || visibleTasks >= taskList.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          loadMoreTasks();
        }
      },
      { threshold: 0.1, root: scrollAreaRef.current },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [visibleTasks, taskList.length, isLoadingMore]);

  // Reset visible tasks when tasks change
  useEffect(() => {
    setVisibleTasks(5);
  }, [tasks?.length]);

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

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCalendar className="size-5" />
          Today's Tasks
        </CardTitle>
        <CardDescription>
          Tasks due today and overdue tasks across all your projects
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {taskList.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <IconCalendar className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No tasks due today</h3>
            <p className="text-sm text-muted-foreground">
              You're all caught up! No tasks are scheduled for completion today.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {taskList.slice(0, visibleTasks).map((task) => {
                const isOverdue = isTaskOverdue(task.taskDueDate);
                return (
                  <div
                    key={task.taskId}
                    className={cn(
                      "rounded-lg border bg-card p-4 transition-colors hover:bg-accent",
                      isOverdue && "border-destructive bg-destructive/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold leading-none">
                                {task.taskName}
                              </h4>
                              {isOverdue && (
                                <Badge
                                  variant="destructive"
                                  className="gap-1 text-xs"
                                >
                                  <IconAlertCircle className="size-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            {task.taskDescription && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {task.taskDescription}
                              </p>
                            )}
                          </div>
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
                          {isOverdue && (
                            <Badge
                              variant="outline"
                              className="gap-1 text-destructive border-destructive"
                            >
                              <IconCalendar className="size-3" />
                              Due:{" "}
                              {new Date(task.taskDueDate).toLocaleDateString()}
                            </Badge>
                          )}
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
                );
              })}

              {/* Load More Trigger */}
              {visibleTasks < taskList.length && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading more tasks...</span>
                    </div>
                  )}
                </div>
              )}

              {/* End Message */}
              {visibleTasks >= taskList.length && taskList.length > 5 && (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    All tasks loaded ({taskList.length} total)
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
