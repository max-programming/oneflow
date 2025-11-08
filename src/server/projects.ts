import { db } from "@/db";
import { users } from "@/db/schema";
import { customers, projects } from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
} from "./auth-middleware";

// Create Project - Only Project Managers and Admins
export const createProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      name: z.string().min(1, "Project name is required"),
      description: z.string().optional(),
      status: z
        .enum([
          "in-progress",
          "waiting-to-start",
          "completed",
          "cancelled",
          "on-hold",
        ])
        .default("waiting-to-start"),
      managerId: z.uuid("Invalid manager ID"),
      startDate: z.string().optional(),
      deadlineDate: z.string().optional(),
      customerId: z.uuid("Invalid customer ID"),
      tags: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const [project] = await db
      .insert(projects)
      .values({
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        deadlineDate: data.deadlineDate,
        customerId: data.customerId,
        managerId: data.managerId,
        tags: data.tags,
      })
      .returning();

    if (!project) {
      throw new Error("Failed to create project");
    }

    return project;
  });

// Get All Projects - All authenticated users can view
export const getProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        managerId: projects.managerId,
        managerName: users.name,
        managerEmail: users.email,
        managerRole: users.role,
        startDate: projects.startDate,
        deadlineDate: projects.deadlineDate,
        customerId: projects.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        tags: projects.tags,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(isNull(projects.deletedAt))
      .orderBy(desc(projects.createdAt));
    return allProjects;
  });

// Get Project by ID - All authenticated users can view
export const getProjectByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        managerId: projects.managerId,
        managerName: users.name,
        managerEmail: users.email,
        managerRole: users.role,
        startDate: projects.startDate,
        deadlineDate: projects.deadlineDate,
        customerId: projects.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        tags: projects.tags,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(and(eq(projects.id, data.projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  });

// Update Project - Only Project Managers and Admins
export const updateProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
      name: z.string().min(1, "Project name is required").optional(),
      description: z.string().optional(),
      status: z
        .enum([
          "in-progress",
          "waiting-to-start",
          "completed",
          "cancelled",
          "on-hold",
        ])
        .optional(),
      managerId: z.uuid("Invalid manager ID").optional(),
      startDate: z.string().optional(),
      deadlineDate: z.string().optional(),
      customerId: z.uuid("Invalid customer ID").optional(),
      tags: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { projectId, ...updateData } = data;

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    if (!updatedProject) {
      throw new Error("Failed to update project");
    }

    return updatedProject;
  });

// Delete Project (Soft Delete) - Only Project Managers and Admins
export const deleteProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedProject] = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, data.projectId), isNull(projects.deletedAt)))
      .returning();

    if (!deletedProject) {
      throw new Error("Project not found");
    }

    return { success: true, message: "Project deleted successfully" };
  });

// Get All Project Managers - All authenticated users can view
export const getProjectManagersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    const projectManagers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.role, "project-manager"), isNull(users.deletedAt)))
      .orderBy(users.createdAt);

    return projectManagers;
  });
