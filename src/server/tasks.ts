import { db } from "@/db";
import { users } from "@/db/schema";
import { projectTasks } from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { eq, ne } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
  teamMemberAccess,
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
      assigneeId: z.uuid("Invalid assignee ID"),
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
        assigneeId: data.assigneeId,
      })
      .returning();

    if (!task) {
      throw new Error("Failed to create task");
    }

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
        assigneeId: projectTasks.assigneeId,
        assigneeName: users.name,
        assigneeEmail: users.email,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assigneeId, users.id))
      .where(eq(projectTasks.projectId, data.projectId))
      .orderBy(projectTasks.createdAt);

    return tasks;
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
        assigneeId: projectTasks.assigneeId,
        assigneeName: users.name,
        assigneeEmail: users.email,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
      })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assigneeId, users.id))
      .where(eq(projectTasks.id, data.taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  });

// Update Project Task - Team members can update, PMs and Admins have full access
export const updateProjectTaskFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, teamMemberAccess])
  .inputValidator(
    z.object({
      taskId: z.uuid("Invalid task ID"),
      name: z.string().min(1, "Task name is required").optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      assigneeId: z.uuid("Invalid assignee ID").optional(),
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
