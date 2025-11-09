import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { User, Building2, Mail, Phone, Shield } from "lucide-react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { type Project } from "@/components/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { useState } from "react";

// Helper function to get status badge variant
function getStatusVariant(status: string) {
  switch (status) {
    case "in-progress":
      return "default";
    case "completed":
      return "default";
    case "waiting-to-start":
      return "outline";
    case "cancelled":
      return "destructive";
    case "on-hold":
      return "secondary";
    default:
      return "outline";
  }
}

// Helper function to format status text
function formatStatus(status: string) {
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to format date
function formatDate(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "Not set";
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

interface ProjectsListTableProps {
  projects: Project[];
  isAdminOrProjectManager: boolean;
}

export function ProjectsListTable({
  projects,
  isAdminOrProjectManager,
}: ProjectsListTableProps) {
  // State for managing dialogs
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

  return (
    <div className="space-y-4">
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

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Project Name</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="min-w-[150px]">Manager</TableHead>
                <TableHead className="min-w-[150px]">Customer</TableHead>
                <TableHead className="min-w-[120px]">Start Date</TableHead>
                <TableHead className="min-w-[120px]">Deadline</TableHead>
                <TableHead className="min-w-[150px]">Tags</TableHead>
                {isAdminOrProjectManager && (
                  <TableHead className="w-[50px]"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50 h-20"
                >
                  <TableCell className="font-medium py-4">
                    <Link
                      to="/dashboard/projects/PRJ-{$projectId}"
                      params={{ projectId: project.id.toString() }}
                      className="hover:underline block"
                    >
                      <div className="w-52 overflow-hidden">
                        <div className="font-semibold truncate">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant={getStatusVariant(project.status)}>
                      {formatStatus(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    {project.managerName ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button className="flex items-center gap-2 text-sm hover:underline text-left">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {project.managerName}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold">
                                {project.managerName}
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              {project.managerEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {project.managerEmail}
                                  </span>
                                </div>
                              )}
                              {project.managerRole && (
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline" className="text-xs">
                                    {project.managerRole
                                      .split("-")
                                      .map(
                                        (word) =>
                                          word.charAt(0).toUpperCase() +
                                          word.slice(1),
                                      )
                                      .join(" ")}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    {project.customerName ? (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button className="flex items-center gap-2 text-sm hover:underline text-left">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {project.customerName}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold">
                                {project.customerName}
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              {project.customerEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {project.customerEmail}
                                  </span>
                                </div>
                              )}
                              {project.customerPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {project.customerPhone}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-4">
                    {formatDate(project.startDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground py-4">
                    {formatDate(project.deadlineDate)}
                  </TableCell>
                  <TableCell className="py-4">
                    {project.tags && project.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 2).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  {isAdminOrProjectManager && (
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="data-[state=open]:bg-muted text-muted-foreground h-8 w-8 p-0"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDotsVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(project);
                            }}
                          >
                            <IconPencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(project);
                            }}
                          >
                            <IconTrash className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton Component for List View
export function ProjectsListTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Project Name</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="min-w-[150px]">Manager</TableHead>
                <TableHead className="min-w-[150px]">Customer</TableHead>
                <TableHead className="min-w-[120px]">Start Date</TableHead>
                <TableHead className="min-w-[120px]">Deadline</TableHead>
                <TableHead className="min-w-[150px]">Tags</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index} className="h-20">
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-3 w-[220px]" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-5 w-[90px]" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-[60px]" />
                      <Skeleton className="h-5 w-[60px]" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
