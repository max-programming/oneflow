import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Folder, ListTodo, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { globalSearchFn } from "@/server/projects";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () =>
      globalSearchFn({
        data: {
          query: debouncedQuery,
          limit: 10,
        },
      }),
    enabled: debouncedQuery.length > 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const allResults = [
    ...(data?.projects.map((p) => ({ type: "project" as const, data: p })) ||
      []),
    ...(data?.tasks.map((t) => ({ type: "task" as const, data: t })) || []),
  ];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      }
    },
    [allResults, selectedIndex],
  );

  const handleSelect = (result: { type: "project" | "task"; data: any }) => {
    if (result.type === "project") {
      navigate({
        to: "/dashboard/projects/$projectId",
        params: { projectId: result.data.id },
      });
    } else if (result.type === "task") {
      navigate({
        to: "/dashboard/projects/$projectId",
        params: { projectId: result.data.projectId },
      });
    }
    setOpen(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "in-progress":
        return "default";
      case "completed":
      case "done":
        return "secondary";
      case "waiting-to-start":
      case "todo":
        return "outline";
      case "cancelled":
        return "destructive";
      case "on-hold":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl p-0"
          showCloseButton={false}
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search projects and tasks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {debouncedQuery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Type to search for projects and tasks
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use{" "}
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                      {typeof navigator !== "undefined" &&
                      navigator.platform.includes("Mac")
                        ? "⌘"
                        : "Ctrl"}
                      K
                    </kbd>{" "}
                    to open
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-4 py-2">
                  {/* Loading skeleton for projects */}
                  <div>
                    <div className="mb-1 px-4 py-1">
                      <Skeleton className="h-4 w-16" />
                    </div>
                    {[...Array(3)].map((_, idx) => (
                      <div
                        key={`project-skeleton-${idx}`}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Loading skeleton for tasks */}
                  <div>
                    <div className="mb-1 px-4 py-1">
                      <Skeleton className="h-4 w-12" />
                    </div>
                    {[...Array(2)].map((_, idx) => (
                      <div
                        key={`task-skeleton-${idx}`}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : allResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No results found for "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {data?.projects && data.projects.length > 0 && (
                    <div>
                      <div className="mb-2 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Projects
                      </div>
                      <div className="space-y-1">
                        {data.projects.map((project, idx) => {
                          const globalIdx = idx;
                          return (
                            <button
                              key={project.id}
                              onClick={() =>
                                handleSelect({ type: "project", data: project })
                              }
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-all hover:bg-accent",
                                selectedIndex === globalIdx &&
                                  "bg-accent shadow-sm",
                              )}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                                <Folder className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold">
                                    {project.name}
                                  </p>
                                  <Badge
                                    variant={getStatusVariant(project.status)}
                                    className="text-[10px]"
                                  >
                                    {formatStatus(project.status)}
                                  </Badge>
                                </div>
                                {project.description && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {project.description}
                                  </p>
                                )}
                                {project.customerName && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    Customer: {project.customerName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {data?.tasks && data.tasks.length > 0 && (
                    <div>
                      <div className="mb-2 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tasks
                      </div>
                      <div className="space-y-1">
                        {data.tasks.map((task, idx) => {
                          const globalIdx = (data?.projects.length || 0) + idx;
                          return (
                            <button
                              key={task.id}
                              onClick={() =>
                                handleSelect({ type: "task", data: task })
                              }
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-all hover:bg-accent",
                                selectedIndex === globalIdx &&
                                  "bg-accent shadow-sm",
                              )}
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-500/10 transition-colors group-hover:bg-green-500/20">
                                <ListTodo className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold">
                                    {task.name}
                                  </p>
                                  <Badge
                                    variant={getStatusVariant(task.status)}
                                    className="text-[10px]"
                                  >
                                    {formatStatus(task.status)}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {task.description}
                                  </p>
                                )}
                                {task.projectName && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    Project: {task.projectName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5">
                    Enter
                  </kbd>
                  Select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
