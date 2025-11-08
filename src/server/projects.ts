import { db } from "@/db";
import { users } from "@/db/schema";
import { customers, projects } from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
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

export const getProjectsPaginatedFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      limit: z.number().default(12),
    }),
  )
  .handler(async ({ data }) => {
    const { cursor, limit } = data;
    
    let query = db
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
      .$dynamic();
      
    if (cursor) {
      const [cursorProject] = await db
        .select({ 
          createdAt: projects.createdAt,
          id: projects.id 
        })
        .from(projects)
        .where(eq(projects.id, cursor))
        .limit(1);
      
      if (cursorProject && cursorProject.createdAt) {
        query = query.where(
          and(
            isNull(projects.deletedAt),
            or(
              lt(projects.createdAt, cursorProject.createdAt),
              and(
                eq(projects.createdAt, cursorProject.createdAt),
                lt(projects.id, cursorProject.id)
              )
            )
          )
        );
      } else {
        query = query.where(isNull(projects.deletedAt));
      }
    } else {
      query = query.where(isNull(projects.deletedAt));
    }
    
    const projectsData = await query
      .orderBy(desc(projects.createdAt), desc(projects.id))
      .limit(limit + 1);
    
    const hasNextPage = projectsData.length > limit;
    const projectsToReturn = hasNextPage ? projectsData.slice(0, limit) : projectsData;
    const nextCursor = hasNextPage ? projectsToReturn[projectsToReturn.length - 1]?.id : undefined;
    
    return {
      projects: projectsToReturn,
      nextCursor,
      hasNextPage,
    };
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

// Get Filtered Projects with Pagination - For PMs
export const getFilteredProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(6),
      filter: z
        .enum(["all", "overdue", "nearing", "active", "completed", "on-hold"])
        .default("all"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const { page, limit, filter } = data;
    const offset = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Build base query
    let whereConditions = [
      eq(projects.managerId, userId),
      isNull(projects.deletedAt),
    ];

    // Get all projects first to filter in-memory (for complex date filters)
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
      .where(and(...whereConditions))
      .orderBy(desc(projects.createdAt));

    // Apply filters
    let filteredProjects = allProjects;
    if (filter === "overdue") {
      filteredProjects = allProjects.filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline < today &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      });
    } else if (filter === "nearing") {
      filteredProjects = allProjects.filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline >= today &&
          deadline <= sevenDaysFromNow &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      });
    } else if (filter === "active") {
      filteredProjects = allProjects.filter((p) => p.status === "in-progress");
    } else if (filter === "completed") {
      filteredProjects = allProjects.filter((p) => p.status === "completed");
    } else if (filter === "on-hold") {
      filteredProjects = allProjects.filter((p) => p.status === "on-hold");
    }

    const totalCount = filteredProjects.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedProjects = filteredProjects.slice(offset, offset + limit);

    // Calculate counts for all filters
    const counts = {
      all: allProjects.length,
      overdue: allProjects.filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline < today &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      }).length,
      nearing: allProjects.filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline >= today &&
          deadline <= sevenDaysFromNow &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      }).length,
      active: allProjects.filter((p) => p.status === "in-progress").length,
      completed: allProjects.filter((p) => p.status === "completed").length,
      "on-hold": allProjects.filter((p) => p.status === "on-hold").length,
    };

    return {
      projects: paginatedProjects,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      counts,
    };
  });

// Get Project Manager Dashboard Data - For authenticated PMs
export const getProjectManagerDashboardFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    
    // Get all projects managed by the PM
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
      .where(and(eq(projects.managerId, userId), isNull(projects.deletedAt)))
      .orderBy(projects.createdAt);

    // Calculate statistics
    const totalProjects = allProjects.length;
    
    const activeProjects = allProjects.filter(
      (p) => p.status === "in-progress"
    ).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const projectsNearingDeadline = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return deadline >= today && deadline <= sevenDaysFromNow && p.status !== "completed" && p.status !== "cancelled";
    }).length;
    
    const overdueProjects = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return deadline < today && p.status !== "completed" && p.status !== "cancelled";
    }).length;
    
    // Status distribution
    const statusDistribution = {
      "in-progress": 0,
      "waiting-to-start": 0,
      "completed": 0,
      "cancelled": 0,
      "on-hold": 0,
    };
    
    allProjects.forEach((p) => {
      if (p.status && statusDistribution[p.status] !== undefined) {
        statusDistribution[p.status]++;
      }
    });
    
    // Get urgent projects (deadline within 7 days)
    const urgentProjects = allProjects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return deadline >= today && deadline <= sevenDaysFromNow && p.status !== "completed" && p.status !== "cancelled";
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
      });
    
    // Get overdue projects
    const overdueProjectsList = allProjects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return deadline < today && p.status !== "completed" && p.status !== "cancelled";
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
      });
    
    // Get recent projects (recently updated)
    const recentProjects = [...allProjects]
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);

    return {
      statistics: {
        totalProjects,
        activeProjects,
        projectsNearingDeadline,
        overdueProjects,
      },
      statusDistribution,
      urgentProjects,
      overdueProjects: overdueProjectsList,
      recentProjects,
    };
  });