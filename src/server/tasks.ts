import { db } from "@/db";
import { users } from "@/db/schema";
import { projectTaskAssignees, projectTasks } from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, ne } from "drizzle-orm";
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
  .handler(async ({ data }) => {
    const [task] = await db
      .insert(projectTasks)
      .values({
        projectId: data.projectId,
        name: data.name,
        description: data.description,
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
        startDate: projectTasks.startDate,
        dueDate: projectTasks.dueDate,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .where(eq(projectTasks.projectId, data.projectId))
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
        startDate: projectTasks.startDate,
        dueDate: projectTasks.dueDate,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
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

// Update Project Task - All authenticated users can update tasks
export const updateProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
      name: z.string().min(1, "Task name is required").optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { taskId, ...updateData } = data;

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

// Delete Project Task - Only Project Managers and Admins
export const deleteProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedTask] = await db
      .delete(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
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
      .where(ne(users.role, "admin"))
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
  .handler(async ({ data }) => {
    // Check if task exists
    const [task] = await db
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(eq(projectTasks.id, data.taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
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
  .handler(async ({ data }) => {
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
