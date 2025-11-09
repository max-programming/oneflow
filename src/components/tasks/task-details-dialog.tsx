import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Plus,
  Trash2,
  TimerIcon,
  Pencil,
} from "lucide-react";
import { getProjectTaskByIdFn } from "@/server/tasks";
import {
  createTimesheetFn,
  getTaskTimesheetsFn,
  deleteTimesheetFn,
  updateTimesheetFn,
} from "@/server/task-timesheet";
import { getSessionFn } from "@/server/auth";
import { TaskStatusEnum } from "@/db/tables/projects";
import { cn } from "@/lib/utils";
import { DialogProps } from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface TaskDetailsDialogProps {
  taskId: number;
  taskName?: string;
  projectId?: number;
}

// Helper function to format time to 12-hour format
function formatTime12Hour(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

// Helper function to parse time string to hours and minutes
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [time, ampm] = timeStr.split(" ");
  const [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

// Helper function to calculate duration in hours
function calculateDuration(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

// Helper function to format duration
function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

function TaskDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Assignees */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskDetailsDialog({
  taskId,
  taskName,
  projectId,
  ...props
}: TaskDetailsDialogProps & DialogProps) {
  const queryClient = useQueryClient();

  // Fetch current user session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSessionFn(),
    staleTime: Infinity,
  });

  // Fetch task details
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task-details", taskId],
    queryFn: () => getProjectTaskByIdFn({ data: { taskId } }),
    enabled: props.open,
    refetchOnWindowFocus: false,
  });

  // Fetch timesheets
  const { data: timesheets, isLoading: timesheetsLoading } = useQuery({
    queryKey: ["task-timesheets", taskId],
    queryFn: () => getTaskTimesheetsFn({ data: { taskId } }),
    enabled: props.open,
    refetchOnWindowFocus: false,
  });

  // Time tracking form state
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [editingTimesheetId, setEditingTimesheetId] = useState<number | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">("AM");
  const [endTime, setEndTime] = useState("05:00");
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">("PM");
  const [notes, setNotes] = useState("");

  // Delete confirmation state
  const [timesheetToDelete, setTimesheetToDelete] = useState<number | null>(
    null,
  );

  // Create timesheet mutation
  const createTimesheetMutation = useMutation({
    mutationFn: createTimesheetFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-timesheets", taskId] });
      toast.success("Time entry added successfully");
      resetForm();
    },
    onError: (error: any) => {
      console.error("Create timesheet error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to add time entry";
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  // Update timesheet mutation
  const updateTimesheetMutation = useMutation({
    mutationFn: updateTimesheetFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-timesheets", taskId] });
      toast.success("Time entry updated successfully");
      resetForm();
    },
    onError: (error: any) => {
      console.error("Update timesheet error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to update time entry";
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  // Delete timesheet mutation
  const deleteTimesheetMutation = useMutation({
    mutationFn: deleteTimesheetFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-timesheets", taskId] });
      toast.success("Time entry deleted successfully");
      setTimesheetToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete time entry");
      setTimesheetToDelete(null);
    },
  });

  const handleEditTimesheet = (
    timesheet: NonNullable<typeof timesheets>[0],
  ) => {
    setEditingTimesheetId(timesheet.id);
    setShowTimeForm(true);

    const startDate = new Date(timesheet.startTime);
    setSelectedDate(startDate);

    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const startHours12 = startHours % 12 || 12;
    setStartTime(
      `${startHours12.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`,
    );
    setStartAmPm(startHours >= 12 ? "PM" : "AM");

    const endDate = new Date(timesheet.endTime);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    const endHours12 = endHours % 12 || 12;
    setEndTime(
      `${endHours12.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
    );
    setEndAmPm(endHours >= 12 ? "PM" : "AM");

    setNotes(timesheet.notes || "");
  };

  const handleSaveTimeEntry = async () => {
    if (!task) return;

    const startDateTime = new Date(selectedDate);
    const startParsed = parseTime(`${startTime} ${startAmPm}`);
    startDateTime.setHours(startParsed.hours, startParsed.minutes, 0, 0);

    const endDateTime = new Date(selectedDate);
    const endParsed = parseTime(`${endTime} ${endAmPm}`);
    endDateTime.setHours(endParsed.hours, endParsed.minutes, 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    // Note: Overlap checking is done on the server side across ALL tasks
    // The server will return an error if there's any overlap with existing time entries
    // This ensures users cannot log time on multiple tasks simultaneously

    try {
      if (editingTimesheetId) {
        // Update existing timesheet
        await updateTimesheetMutation.mutateAsync({
          data: {
            timesheetId: editingTimesheetId,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            notes: notes || undefined,
          },
        });
      } else {
        // Create new timesheet
        if (!projectId) {
          toast.error("Project ID is required");
          return;
        }
        await createTimesheetMutation.mutateAsync({
          data: {
            projectId: projectId,
            taskId: taskId,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            notes: notes || undefined,
          },
        });
      }
    } catch (error) {
      // Error is already handled in mutation onError
      console.error("Failed to save timesheet:", error);
    }
  };

  const handleDeleteTimesheet = (timesheetId: number) => {
    deleteTimesheetMutation.mutate({
      data: { timesheetId },
    });
  };

  const resetForm = () => {
    setShowTimeForm(false);
    setEditingTimesheetId(null);
    setSelectedDate(new Date());
    setStartTime("09:00");
    setStartAmPm("AM");
    setEndTime("05:00");
    setEndAmPm("PM");
    setNotes("");
  };

  // Filter timesheets based on user role
  const filteredTimesheets =
    timesheets?.filter((timesheet) => {
      // Team members only see their own time entries
      if (session?.user?.role === "team-member") {
        return timesheet.userId === session.user.id;
      }
      // Project managers and admins see all
      return true;
    }) || [];

  // Calculate total time tracked
  const totalTimeTracked = filteredTimesheets.reduce((total, timesheet) => {
    const duration = calculateDuration(
      new Date(timesheet.startTime),
      new Date(timesheet.endTime),
    );
    return total + duration;
  }, 0);

  // Group timesheets by user (for PM/Admin view)
  const timesheetsByUser =
    session?.user?.role !== "team-member"
      ? filteredTimesheets.reduce(
          (acc, timesheet) => {
            const userId = timesheet.userId;
            if (!userId) return acc;
            if (!acc[userId]) {
              acc[userId] = {
                userName: timesheet.userName || "Unknown",
                userEmail: timesheet.userEmail || "",
                entries: [],
                totalHours: 0,
              };
            }
            acc[userId].entries?.push(timesheet);
            const duration = calculateDuration(
              new Date(timesheet.startTime),
              new Date(timesheet.endTime),
            );
            acc[userId].totalHours += duration;
            return acc;
          },
          {} as Record<
            string,
            {
              userName: string;
              userEmail: string;
              entries: typeof timesheets;
              totalHours: number;
            }
          >,
        )
      : {};

  function formatDateTime(dateString: string | Date) {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const getStatusColor = (status: TaskStatusEnum) => {
    switch (status) {
      case "waiting-to-start":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "stuck":
        return "bg-red-100 text-red-800 border-red-200";
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: TaskStatusEnum) => {
    switch (status) {
      case "waiting-to-start":
        return "To Do";
      case "in-progress":
        return "In Progress";
      case "stuck":
        return "Stuck";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  const isOverdue = task
    ? new Date(task.dueDate) < new Date() && task.status !== "done"
    : false;

  // Check if current user is assigned to this task or is an admin
  const isAssignedOrAdmin =
    session?.user?.role === "admin" ||
    task?.assignees.some((assignee) => assignee.userId === session?.user?.id);

  return (
    <Dialog {...props}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl">
            {task?.name || taskName || "Task Details"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-6 pb-6">
            {isLoading && <TaskDetailsSkeleton />}

            {error && (
              <div className="flex items-center justify-center py-8">
                <p className="text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load task"}
                </p>
              </div>
            )}

            {task && (
              <div className="space-y-6">
                {/* Status and Metadata */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm font-medium px-3 py-1",
                      getStatusColor(task.status),
                    )}
                  >
                    {getStatusLabel(task.status)}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Created {formatDateTime(task.createdAt)}
                  </div>
                </div>

                <Separator />

                {/* Description */}
                {task.description && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Description</h3>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Start Date</span>
                    </div>
                    <p className="text-sm bg-muted/30 rounded px-3 py-2">
                      {((dateString: string) => {
                        return new Date(dateString).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        );
                      })(task.startDate)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Due Date</span>
                    </div>
                    <p
                      className={cn(
                        "text-sm rounded px-3 py-2",
                        isOverdue
                          ? "bg-red-50 text-red-800 border border-red-200"
                          : "bg-muted/30",
                      )}
                    >
                      {((dateString: string) => {
                        return new Date(dateString).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        );
                      })(task.dueDate)}
                      {isOverdue && (
                        <span className="ml-2 font-medium">(Overdue)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Assignees */}
                {task.assignees.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">
                        Assignees ({task.assignees.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {task.assignees.map((assignee) => (
                        <div
                          key={assignee.userId}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {assignee.userName
                                ? assignee.userName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : assignee.userEmail
                                    ?.split("@")[0]
                                    ?.slice(0, 2)
                                    .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {assignee.userName || "Unknown User"}
                            </div>
                            {assignee.userEmail && (
                              <div className="text-xs text-muted-foreground truncate">
                                {assignee.userEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Tracking Section */}
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TimerIcon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">Time Tracking</h3>
                    </div>
                    {isAssignedOrAdmin && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (showTimeForm) {
                            resetForm();
                          } else {
                            setShowTimeForm(true);
                          }
                        }}
                        variant={showTimeForm ? "outline" : "default"}
                      >
                        {showTimeForm ? (
                          "Cancel"
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" /> Add Time
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Show message for non-assigned users */}
                  {!isAssignedOrAdmin && filteredTimesheets.length === 0 && (
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Only assigned team members can log time for this task.
                      </p>
                    </div>
                  )}

                  {/* Total Time */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {session?.user?.role === "team-member"
                          ? "Your Total Time"
                          : "Total Time"}{" "}
                        Tracked
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatDuration(totalTimeTracked)}
                      </span>
                    </div>
                  </div>

                  {/* Add/Edit Time Form */}
                  {showTimeForm && isAssignedOrAdmin && (
                    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                      <h4 className="font-medium text-sm">
                        {editingTimesheetId
                          ? "Edit Time Entry"
                          : "Add Time Entry"}
                      </h4>

                      {/* Date Picker */}
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground",
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {selectedDate
                                ? format(selectedDate, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time Inputs */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="flex-1"
                            />
                            <Select
                              value={startAmPm}
                              onValueChange={(value: "AM" | "PM") =>
                                setStartAmPm(value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* End Time */}
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="flex-1"
                            />
                            <Select
                              value={endAmPm}
                              onValueChange={(value: "AM" | "PM") =>
                                setEndAmPm(value)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any notes about this time entry..."
                          rows={3}
                        />
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={handleSaveTimeEntry}
                        disabled={
                          createTimesheetMutation.isPending ||
                          updateTimesheetMutation.isPending
                        }
                        className="w-full"
                      >
                        {createTimesheetMutation.isPending ||
                        updateTimesheetMutation.isPending
                          ? editingTimesheetId
                            ? "Updating..."
                            : "Adding..."
                          : editingTimesheetId
                            ? "Update Time Entry"
                            : "Add Time Entry"}
                      </Button>
                    </div>
                  )}

                  {/* Time Entries List */}
                  {timesheetsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : filteredTimesheets.length > 0 ? (
                    <div className="space-y-4">
                      {session?.user?.role === "team-member" ? (
                        // Team Member View - Show their own entries
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Your Time Entries
                          </h4>
                          {filteredTimesheets.map((timesheet) => {
                            const duration = calculateDuration(
                              new Date(timesheet.startTime),
                              new Date(timesheet.endTime),
                            );
                            return (
                              <div
                                key={timesheet.id}
                                className="bg-muted/30 rounded-lg p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {format(
                                          new Date(timesheet.startTime),
                                          "PPP",
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {formatTime12Hour(
                                          new Date(timesheet.startTime),
                                        )}{" "}
                                        -{" "}
                                        {formatTime12Hour(
                                          new Date(timesheet.endTime),
                                        )}
                                      </span>
                                      <Badge
                                        variant="secondary"
                                        className="ml-2"
                                      >
                                        {formatDuration(duration)}
                                      </Badge>
                                    </div>
                                    {timesheet.notes && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {timesheet.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleEditTimesheet(timesheet)
                                      }
                                      disabled={
                                        deleteTimesheetMutation.isPending
                                      }
                                    >
                                      <Pencil className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setTimesheetToDelete(timesheet.id)
                                      }
                                      disabled={
                                        deleteTimesheetMutation.isPending
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // PM/Admin View - Grouped by user
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Time Entries by Team Member
                          </h4>
                          {Object.entries(timesheetsByUser).map(
                            ([userId, userData]) => (
                              <div
                                key={userId}
                                className="border rounded-lg p-4 space-y-3"
                              >
                                {/* User Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {userData.userName
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {userData.userName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {userData.userEmail}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="font-semibold"
                                  >
                                    {formatDuration(userData.totalHours)}
                                  </Badge>
                                </div>

                                {/* User's Time Entries */}
                                <div className="space-y-2 pl-11">
                                  {userData.entries?.map((timesheet) => {
                                    const duration = calculateDuration(
                                      new Date(timesheet.startTime),
                                      new Date(timesheet.endTime),
                                    );
                                    const isOwnEntry =
                                      timesheet.userId === session?.user?.id;
                                    return (
                                      <div
                                        key={timesheet.id}
                                        className="bg-muted/30 rounded p-2 text-xs space-y-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium">
                                                  {format(
                                                    new Date(
                                                      timesheet.startTime,
                                                    ),
                                                    "PPP",
                                                  )}
                                                </span>
                                              </div>
                                              <span className="font-semibold text-primary">
                                                {formatDuration(duration)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Clock className="h-3 w-3" />
                                              <span>
                                                {formatTime12Hour(
                                                  new Date(timesheet.startTime),
                                                )}{" "}
                                                -{" "}
                                                {formatTime12Hour(
                                                  new Date(timesheet.endTime),
                                                )}
                                              </span>
                                            </div>
                                            {timesheet.notes && (
                                              <p className="text-muted-foreground pt-1">
                                                {timesheet.notes}
                                              </p>
                                            )}
                                          </div>
                                          {(isOwnEntry ||
                                            session?.user?.role ===
                                              "admin") && (
                                            <div className="flex gap-1 shrink-0">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={() =>
                                                  handleEditTimesheet(timesheet)
                                                }
                                                disabled={
                                                  deleteTimesheetMutation.isPending
                                                }
                                              >
                                                <Pencil className="h-3 w-3 text-blue-600" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={() =>
                                                  setTimesheetToDelete(
                                                    timesheet.id,
                                                  )
                                                }
                                                disabled={
                                                  deleteTimesheetMutation.isPending
                                                }
                                              >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No time entries yet. Add your first time entry above.
                    </div>
                  )}
                </div>

                {/* Last Updated */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated {formatDateTime(task.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!timesheetToDelete}
        onOpenChange={(open) => !open && setTimesheetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTimesheetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                timesheetToDelete && handleDeleteTimesheet(timesheetToDelete)
              }
              disabled={deleteTimesheetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTimesheetMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
