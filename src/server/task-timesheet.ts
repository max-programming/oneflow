import { db } from "@/db";
import { users } from "@/db/schema";
import {
  projects,
  projectTaskAssignees,
  projectTasks,
  projectTaskTimesheets,
} from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { allRoles, authMiddleware } from "./auth-middleware";

// Create Timesheet - Only assigned users can log time for their tasks
export const createTimesheetFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
      taskId: z.uuid("Invalid task ID"),
      startTime: z.iso.datetime("Invalid ISO datetime string"),
      endTime: z.iso.datetime("Invalid ISO datetime string"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if the task exists
    const [task] = await db
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Check if the user is assigned to this task
    const [assignee] = await db
      .select({ userId: projectTaskAssignees.userId })
      .from(projectTaskAssignees)
      .where(
        and(
          eq(projectTaskAssignees.taskId, data.taskId),
          eq(projectTaskAssignees.userId, session.user.id),
        ),
      )
      .limit(1);

    // Only assigned users or admins can log time for this task
    if (!assignee && session.user.role !== "admin") {
      throw new Error("Only assigned users can log time for this task");
    }

    // Validate that endTime is after startTime
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      throw new Error("End time must be after start time");
    }

    const [timesheet] = await db
      .insert(projectTaskTimesheets)
      .values({
        projectId: data.projectId,
        taskId: data.taskId,
        userId: session.user.id,
        notes: data.notes,
        startTime: start,
        endTime: end,
      })
      .returning();

    if (!timesheet) {
      throw new Error("Failed to create timesheet");
    }

    return timesheet;
  });

// Get All Timesheets for a Task - All users can view
export const getTaskTimesheetsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
    }),
  )
  .handler(async ({ data }) => {
    const timesheets = await db
      .select({
        id: projectTaskTimesheets.id,
        projectId: projectTaskTimesheets.projectId,
        projectName: projects.name,
        taskId: projectTaskTimesheets.taskId,
        taskName: projectTasks.name,
        userId: projectTaskTimesheets.userId,
        userName: users.name,
        userEmail: users.email,
        startTime: projectTaskTimesheets.startTime,
        endTime: projectTaskTimesheets.endTime,
        notes: projectTaskTimesheets.notes,
        createdAt: projectTaskTimesheets.createdAt,
        updatedAt: projectTaskTimesheets.updatedAt,
      })
      .from(projectTaskTimesheets)
      .leftJoin(projects, eq(projectTaskTimesheets.projectId, projects.id))
      .leftJoin(projectTasks, eq(projectTaskTimesheets.taskId, projectTasks.id))
      .leftJoin(users, eq(projectTaskTimesheets.userId, users.id))
      .where(eq(projectTaskTimesheets.taskId, data.taskId))
      .orderBy(projectTaskTimesheets.startTime);

    return timesheets;
  });

// Update Timesheet - Only the timesheet owner or admin can update
export const updateTimesheetFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      timesheetId: z.uuid("Invalid timesheet ID"),
      startTime: z.iso.datetime("Invalid ISO datetime string").optional(),
      endTime: z.iso.datetime("Invalid ISO datetime string").optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if timesheet exists and get userId
    const [existingTimesheet] = await db
      .select({
        userId: projectTaskTimesheets.userId,
        startTime: projectTaskTimesheets.startTime,
        endTime: projectTaskTimesheets.endTime,
        taskId: projectTaskTimesheets.taskId,
      })
      .from(projectTaskTimesheets)
      .where(eq(projectTaskTimesheets.id, data.timesheetId))
      .limit(1);

    if (!existingTimesheet) {
      throw new Error("Timesheet not found");
    }

    // Only the timesheet owner or admin can update
    if (
      session.user.id !== existingTimesheet.userId &&
      session.user.role !== "admin"
    ) {
      throw new Error("You can only update your own timesheets");
    }

    const updateData: { startTime?: Date; endTime?: Date; notes?: string } = {};

    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Validate that endTime is after startTime
    const finalStartTime = updateData.startTime || existingTimesheet.startTime;
    const finalEndTime = updateData.endTime || existingTimesheet.endTime;

    if (finalEndTime <= finalStartTime) {
      throw new Error("End time must be after start time");
    }

    const [updatedTimesheet] = await db
      .update(projectTaskTimesheets)
      .set(updateData)
      .where(eq(projectTaskTimesheets.id, data.timesheetId))
      .returning();

    if (!updatedTimesheet) {
      throw new Error("Failed to update timesheet");
    }

    return updatedTimesheet;
  });

// Delete Timesheet - Only the timesheet owner or admin can delete
export const deleteTimesheetFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      timesheetId: z.uuid("Invalid timesheet ID"),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if timesheet exists and get userId
    const [existingTimesheet] = await db
      .select({ userId: projectTaskTimesheets.userId })
      .from(projectTaskTimesheets)
      .where(eq(projectTaskTimesheets.id, data.timesheetId))
      .limit(1);

    if (!existingTimesheet) {
      throw new Error("Timesheet not found");
    }

    // Only the timesheet owner or admin can delete
    if (
      session.user.id !== existingTimesheet.userId &&
      session.user.role !== "admin"
    ) {
      throw new Error("You can only delete your own timesheets");
    }

    const [deletedTimesheet] = await db
      .delete(projectTaskTimesheets)
      .where(eq(projectTaskTimesheets.id, data.timesheetId))
      .returning();

    if (!deletedTimesheet) {
      throw new Error("Failed to delete timesheet");
    }

    return { success: true, message: "Timesheet deleted successfully" };
  });
