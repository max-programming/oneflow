import { db } from "@/db";
import { UserRole, users } from "@/db/schema";
import {
  projectTaskAssignees,
  projectTasks,
  projectTaskTimesheets,
  projects,
} from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
} from "./auth-middleware";

// Create Project Task - Project Managers and Admins can create tasks
export const createProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      startDate: z.string(),
      dueDate: z.string(),
      assigneeIds: z
        .array(z.uuid("Invalid assignee ID"))
        .min(1, "At least one assignee is required"),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Get the project to check managerId
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user is project manager or admin
    verifyProjectManager(session.user.id, session.user.role, project.managerId);

    const [task] = await db
      .insert(projectTasks)
      .values({
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        status: "waiting-to-start", // Explicitly set default status
        startDate: data.startDate,
        dueDate: data.dueDate,
      })
      .returning();

    if (!task) {
      throw new Error("Failed to create task");
    }

    // Add assignees to the task
    await db.insert(projectTaskAssignees).values(
      data.assigneeIds.map((userId) => ({
        taskId: task.id,
        userId,
      })),
    );

    return task;
  });

// Get All Tasks for a Project - All users can view tasks
export const getProjectTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const tasks = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
        name: projectTasks.name,
        description: projectTasks.description,
        status: projectTasks.status,
        startDate: projectTasks.startDate,
        dueDate: projectTasks.dueDate,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, data.projectId),
          isNull(projectTasks.deletedAt),
        ),
      )
      .orderBy(projectTasks.createdAt);

    // Get assignees for all tasks
    const taskIds = tasks.map((task) => task.id);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: projectTaskAssignees.userId,
              userName: users.name,
              userEmail: users.email,
            })
            .from(projectTaskAssignees)
            .leftJoin(users, eq(projectTaskAssignees.userId, users.id))
            .where(inArray(projectTaskAssignees.taskId, taskIds))
        : [];

    // Group assignees by taskId
    const assigneesByTask = assignees.reduce(
      (acc, assignee) => {
        if (!acc[assignee.taskId]) {
          acc[assignee.taskId] = [];
        }
        acc[assignee.taskId].push({
          userId: assignee.userId,
          userName: assignee.userName,
          userEmail: assignee.userEmail,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{
          userId: string;
          userName: string | null;
          userEmail: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    return tasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.id] || [],
    }));
  });

// Get Task by ID - All users can view
export const getProjectTaskByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [task] = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
        name: projectTasks.name,
        description: projectTasks.description,
        status: projectTasks.status,
        startDate: projectTasks.startDate,
        dueDate: projectTasks.dueDate,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .where(
        and(eq(projectTasks.id, data.taskId), isNull(projectTasks.deletedAt)),
      )
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Get assignees for this task
    const assignees = await db
      .select({
        userId: projectTaskAssignees.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(projectTaskAssignees)
      .leftJoin(users, eq(projectTaskAssignees.userId, users.id))
      .where(eq(projectTaskAssignees.taskId, data.taskId));

    return {
      ...task,
      assignees,
    };
  });

// Update Project Task - Only Project Managers and Admins
export const updateProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
      name: z.string().min(1, "Task name is required").optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z
        .enum(["waiting-to-start", "in-progress", "stuck", "done"])
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const { taskId, ...updateData } = data;

    // Get the task to find its projectId
    const [task] = await db
      .select({ projectId: projectTasks.projectId })
      .from(projectTasks)
      .where(eq(projectTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the project to check managerId
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user is project manager or admin
    verifyProjectManager(session.user.id, session.user.role, project.managerId);

    const [updatedTask] = await db
      .update(projectTasks)
      .set(updateData)
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (!updatedTask) {
      throw new Error("Failed to update task");
    }

    return updatedTask;
  });

// Delete Project Task (Soft Delete) - Only Project Managers and Admins
export const deleteProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Get the task to find its projectId
    const [task] = await db
      .select({ projectId: projectTasks.projectId })
      .from(projectTasks)
      .where(
        and(eq(projectTasks.id, data.taskId), isNull(projectTasks.deletedAt)),
      )
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the project to check managerId
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user is project manager or admin

    verifyProjectManager(session.user.id, session.user.role, project.managerId);

    const [deletedTask] = await db
      .update(projectTasks)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(projectTasks.id, data.taskId), isNull(projectTasks.deletedAt)),
      )
      .returning();

    if (!deletedTask) {
      throw new Error("Task not found");
    }

    return { success: true, message: "Task deleted successfully" };
  });

// Get All Users Except Admins - All authenticated users can view
export const getNonAdminUsersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    const nonAdminUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(ne(users.role, "admin"), isNull(users.deletedAt)))
      .orderBy(users.createdAt);

    return nonAdminUsers;
  });

// Add Assignee to Task - Only Project Managers and Admins
export const addTaskAssigneeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
      userId: z.uuid("Invalid user ID"),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if task exists and get projectId
    const [task] = await db
      .select({ id: projectTasks.id, projectId: projectTasks.projectId })
      .from(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the project to check managerId
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user is project manager or admin
    if (
      session.user.id !== project.managerId &&
      session.user.role !== "admin"
    ) {
      throw new Error("Only the project manager or admin can delete tasks");
    }

    // Check if user is already assigned
    const [existingAssignee] = await db
      .select()
      .from(projectTaskAssignees)
      .where(
        and(
          eq(projectTaskAssignees.taskId, data.taskId),
          eq(projectTaskAssignees.userId, data.userId),
        ),
      )
      .limit(1);

    if (existingAssignee) {
      throw new Error("User is already assigned to this task");
    }

    const [assignee] = await db
      .insert(projectTaskAssignees)
      .values({
        taskId: data.taskId,
        userId: data.userId,
      })
      .returning();

    if (!assignee) {
      throw new Error("Failed to add assignee");
    }

    return assignee;
  });

// Remove Assignee from Task - Only Project Managers and Admins
export const removeTaskAssigneeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
      userId: z.uuid("Invalid user ID"),
    }),
  )
  .handler(async ({ data, context }) => {
    const session = context;

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Get the task to find its projectId
    const [task] = await db
      .select({ projectId: projectTasks.projectId })
      .from(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the project to check managerId
    const [project] = await db
      .select({ managerId: projects.managerId })
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user is project manager or admin
    verifyProjectManager(session.user.id, session.user.role, project.managerId);

    const [deletedAssignee] = await db
      .delete(projectTaskAssignees)
      .where(
        and(
          eq(projectTaskAssignees.taskId, data.taskId),
          eq(projectTaskAssignees.userId, data.userId),
        ),
      )
      .returning();

    if (!deletedAssignee) {
      throw new Error("Assignee not found");
    }

    return { success: true, message: "Assignee removed successfully" };
  });

// Get Task Assignees - All authenticated users can view
export const getTaskAssigneesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
    }),
  )
  .handler(async ({ data }) => {
    const assignees = await db
      .select({
        id: projectTaskAssignees.id,
        taskId: projectTaskAssignees.taskId,
        userId: projectTaskAssignees.userId,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        createdAt: projectTaskAssignees.createdAt,
      })
      .from(projectTaskAssignees)
      .leftJoin(users, eq(projectTaskAssignees.userId, users.id))
      .where(eq(projectTaskAssignees.taskId, data.taskId));

    return assignees;
  });

// Get Project Total Logged Hours - All authenticated users can view
export const getProjectTotalLoggedHoursFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const timesheets = await db
      .select({
        startTime: projectTaskTimesheets.startTime,
        endTime: projectTaskTimesheets.endTime,
      })
      .from(projectTaskTimesheets)
      .where(eq(projectTaskTimesheets.projectId, data.projectId));

    // Calculate total hours
    const totalMinutes = timesheets.reduce((total, timesheet) => {
      const start = new Date(timesheet.startTime);
      const end = new Date(timesheet.endTime);
      const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
      return total + minutes;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return {
      totalHours: hours,
      totalMinutes: minutes,
      formatted: `${hours}:${minutes.toString().padStart(2, "0")}`,
    };
  });

// Get Project Weekly Logged Hours - All authenticated users can view
export const getProjectWeeklyLoggedHoursFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    // Get timesheets for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const timesheets = await db
      .select({
        startTime: projectTaskTimesheets.startTime,
        endTime: projectTaskTimesheets.endTime,
      })
      .from(projectTaskTimesheets)
      .where(
        and(
          eq(projectTaskTimesheets.projectId, data.projectId),
          sql`${projectTaskTimesheets.startTime} >= ${sevenDaysAgo}`,
        ),
      );

    // Group by day of week and calculate hours
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const hoursByDay: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    timesheets.forEach((timesheet) => {
      const start = new Date(timesheet.startTime);
      const end = new Date(timesheet.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const dayName = dayNames[start.getDay()];
      hoursByDay[dayName] += hours;
    });

    return Object.entries(hoursByDay).map(([day, hours]) => ({
      day,
      hours: Math.round(hours * 10) / 10, // Round to 1 decimal place
    }));
  });

async function verifyProjectManager(
  userId: string,
  userRole: UserRole,
  managerId: string,
) {
  if (userId !== managerId && userRole !== "admin") {
    throw new Error(
      "Only the project manager or admin can add or modify tasks and assignees",
    );
  }
}
