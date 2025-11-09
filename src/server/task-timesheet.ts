import { db } from "@/db";
import { users } from "@/db/schema";
import {
  projects,
  projectTaskAssignees,
  projectTasks,
  projectTaskTimesheets,
} from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, lt, not, sql } from "drizzle-orm";
import { z } from "zod";
import { allRoles, authMiddleware } from "./auth-middleware";

// Create Timesheet - Only assigned users can log time for their tasks
export const createTimesheetFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number(),
      taskId: z.number(),
      startTime: z.string().datetime("Invalid ISO datetime string"),
      endTime: z.string().datetime("Invalid ISO datetime string"),
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

    // Check for overlapping time entries across ALL tasks for this user using SQL
    // This prevents users from logging time on multiple tasks simultaneously
    // Overlap occurs when: new start < existing end AND new end > existing start
    const [overlapCheck] = await db
      .select({
        count: projectTaskTimesheets.id,
        taskName: projectTasks.name,
      })
      .from(projectTaskTimesheets)
      .leftJoin(projectTasks, eq(projectTaskTimesheets.taskId, projectTasks.id))
      .where(
        and(
          eq(projectTaskTimesheets.userId, session.user.id),
          // SQL overlap check using proper comparisons
          lt(sql`${start.toISOString()}`, projectTaskTimesheets.endTime),
          gt(sql`${end.toISOString()}`, projectTaskTimesheets.startTime),
        ),
      )
      .limit(1);

    if (overlapCheck && overlapCheck.count) {
      throw new Error(
        `This time entry overlaps with another entry${overlapCheck.taskName ? ` on task "${overlapCheck.taskName}"` : ""}. You cannot log time on multiple tasks simultaneously.`,
      );
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
      taskId: z.number(),
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
      timesheetId: z.number(),
      startTime: z.string().datetime("Invalid ISO datetime string").optional(),
      endTime: z.string().datetime("Invalid ISO datetime string").optional(),
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

    // Check for overlapping time entries across ALL tasks using SQL
    // Exclude the current timesheet being edited
    // Overlap occurs when: new start < existing end AND new end > existing start
    const [overlapCheck] = await db
      .select({
        count: projectTaskTimesheets.id,
        taskName: projectTasks.name,
      })
      .from(projectTaskTimesheets)
      .leftJoin(projectTasks, eq(projectTaskTimesheets.taskId, projectTasks.id))
      .where(
        and(
          eq(projectTaskTimesheets.userId, session.user.id),
          not(eq(projectTaskTimesheets.id, data.timesheetId)),
          lt(
            sql`${finalStartTime.toISOString()}`,
            projectTaskTimesheets.endTime,
          ),
          gt(
            sql`${finalEndTime.toISOString()}`,
            projectTaskTimesheets.startTime,
          ),
        ),
      )
      .limit(1);

    if (overlapCheck && overlapCheck.count) {
      throw new Error(
        `This time entry overlaps with another entry${overlapCheck.taskName ? ` on task "${overlapCheck.taskName}"` : ""}. You cannot log time on multiple tasks simultaneously.`,
      );
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
      timesheetId: z.number(),
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
