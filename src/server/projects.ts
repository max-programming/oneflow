import { db } from "@/db";
import { users } from "@/db/schema";
import {
  customers,
  projects,
  projectTasks,
  projectTaskAssignees,
} from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import {
  and,
  desc,
  eq,
  isNull,
  lt,
  or,
  ilike,
  gte,
  lte,
  arrayOverlaps,
  SQL,
  inArray,
} from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
} from "./auth-middleware";
import { getProjectId } from "@/lib/id-utils";

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
      managerId: z.number("Invalid manager ID"),
      startDate: z.string().optional(),
      deadlineDate: z.string().optional(),
      customerId: z.number("Invalid customer ID"),
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

    return allProjects.map((p) => ({
      ...p,
      displayId: getProjectId(p.id),
    }));
  });

// Get Project by ID - All authenticated users can view
export const getProjectByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
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

    return {
      ...project,
      displayId: getProjectId(project.id),
    };
  });

// Update Project - Only Project Managers and Admins
export const updateProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
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
      managerId: z.number("Invalid manager ID").optional(),
      startDate: z.string().optional(),
      deadlineDate: z.string().optional(),
      customerId: z.number("Invalid customer ID").optional(),
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
      projectId: z.number("Invalid project ID"),
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
      cursor: z.number().optional(),
      limit: z.number().default(12),
      query: z.string().optional(),
      manager: z.string().optional(),
      customer: z.string().optional(),
      status: z
        .enum([
          "all",
          "in-progress",
          "waiting-to-start",
          "completed",
          "cancelled",
          "on-hold",
        ])
        .optional(),
      startDate: z.string().optional(),
      deadlineDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const {
      cursor,
      limit,
      query,
      manager,
      customer,
      status,
      startDate,
      deadlineDate,
      tags,
    } = data;

    let dbQuery = db
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

    // Build filter conditions
    const filterConditions: SQL[] = [isNull(projects.deletedAt)];

    // Text search filter (project name and description)
    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      filterConditions.push(ilike(projects.name, searchTerm));
    }

    // Manager filter
    if (manager) {
      filterConditions.push(eq(projects.managerId, parseInt(manager)));
    }

    // Customer filter
    if (customer) {
      filterConditions.push(eq(projects.customerId, parseInt(customer)));
    }

    // Status filter
    if (status && status !== "all") {
      filterConditions.push(eq(projects.status, status));
    }

    // Start date filter (projects starting after this date)
    if (startDate) {
      filterConditions.push(gte(projects.startDate, startDate));
    }

    // Deadline date filter (projects due before this date)
    if (deadlineDate) {
      filterConditions.push(lte(projects.deadlineDate, deadlineDate));
    }

    // Tags filter (OR logic - project has any of the selected tags)
    if (tags && tags.length > 0) {
      filterConditions.push(arrayOverlaps(projects.tags, tags));
    }

    // Apply cursor pagination
    if (cursor) {
      const [cursorProject] = await db
        .select({
          createdAt: projects.createdAt,
          id: projects.id,
        })
        .from(projects)
        .where(eq(projects.id, cursor))
        .limit(1);

      if (cursorProject && cursorProject.createdAt) {
        const cursorCondition = or(
          lt(projects.createdAt, cursorProject.createdAt),
          and(
            eq(projects.createdAt, cursorProject.createdAt),
            lt(projects.id, cursorProject.id),
          ),
        );
        if (cursorCondition) {
          filterConditions.push(cursorCondition);
        }
      }
    }

    // Apply all filter conditions
    dbQuery = dbQuery.where(and(...filterConditions));

    const projectsData = await dbQuery
      .orderBy(desc(projects.createdAt), desc(projects.id))
      .limit(limit + 1);

    const hasNextPage = projectsData.length > limit;
    const projectsToReturn = hasNextPage
      ? projectsData.slice(0, limit)
      : projectsData;
    const nextCursor = hasNextPage
      ? projectsToReturn[projectsToReturn.length - 1]?.id
      : undefined;

    return {
      projects: projectsToReturn.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
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
      projects: paginatedProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
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
      (p) => p.status === "in-progress",
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const projectsNearingDeadline = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline >= today &&
        deadline <= sevenDaysFromNow &&
        p.status !== "completed" &&
        p.status !== "cancelled"
      );
    }).length;

    const overdueProjects = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline < today && p.status !== "completed" && p.status !== "cancelled"
      );
    }).length;

    // Status distribution
    const statusDistribution = {
      "in-progress": 0,
      "waiting-to-start": 0,
      completed: 0,
      cancelled: 0,
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
        return (
          deadline >= today &&
          deadline <= sevenDaysFromNow &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
      });

    // Get overdue projects
    const overdueProjectsList = allProjects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline < today &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
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
      urgentProjects: urgentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      overdueProjects: overdueProjectsList.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      recentProjects: recentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
    };
  });

// Get Team Member Dashboard Data - For authenticated team members
export const getTeamMemberDashboardFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    // Get all projects where user is assigned to at least one task
    const userTaskAssignments = await db
      .select({
        taskId: projectTaskAssignees.taskId,
      })
      .from(projectTaskAssignees)
      .where(eq(projectTaskAssignees.userId, userId));

    const taskIds = userTaskAssignments.map((pta) => pta.taskId);

    if (taskIds.length === 0) {
      // No tasks assigned, return empty data
      return {
        statistics: {
          totalProjects: 0,
          activeProjects: 0,
          projectsNearingDeadline: 0,
          overdueProjects: 0,
        },
        statusDistribution: {
          "in-progress": 0,
          "waiting-to-start": 0,
          completed: 0,
          cancelled: 0,
          "on-hold": 0,
        },
        urgentProjects: [],
        overdueProjects: [],
        recentProjects: [],
      };
    }

    // Get all tasks assigned to the user
    const assignedTasks = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
      })
      .from(projectTasks)
      .where(
        and(inArray(projectTasks.id, taskIds), isNull(projectTasks.deletedAt)),
      );

    const projectIds = [...new Set(assignedTasks.map((t) => t.projectId))];

    if (projectIds.length === 0) {
      return {
        statistics: {
          totalProjects: 0,
          activeProjects: 0,
          projectsNearingDeadline: 0,
          overdueProjects: 0,
        },
        statusDistribution: {
          "in-progress": 0,
          "waiting-to-start": 0,
          completed: 0,
          cancelled: 0,
          "on-hold": 0,
        },
        urgentProjects: [],
        overdueProjects: [],
        recentProjects: [],
      };
    }

    // Get all projects where user has assigned tasks
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
      .where(and(inArray(projects.id, projectIds), isNull(projects.deletedAt)))
      .orderBy(projects.createdAt);

    // Calculate statistics
    const totalProjects = allProjects.length;

    const activeProjects = allProjects.filter(
      (p) => p.status === "in-progress",
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const projectsNearingDeadline = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline >= today &&
        deadline <= sevenDaysFromNow &&
        p.status !== "completed" &&
        p.status !== "cancelled"
      );
    }).length;

    const overdueProjects = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline < today && p.status !== "completed" && p.status !== "cancelled"
      );
    }).length;

    // Status distribution
    const statusDistribution = {
      "in-progress": 0,
      "waiting-to-start": 0,
      completed: 0,
      cancelled: 0,
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
        return (
          deadline >= today &&
          deadline <= sevenDaysFromNow &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
      });

    // Get overdue projects
    const overdueProjectsList = allProjects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline < today &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
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
      urgentProjects: urgentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      overdueProjects: overdueProjectsList.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      recentProjects: recentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
    };
  });

// Get Admin Dashboard Data - For admins to see all system data
export const getAdminDashboardFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async ({ context }) => {
    // Verify user is admin
    if (context.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get all projects
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
      .orderBy(projects.createdAt);

    // Calculate statistics
    const totalProjects = allProjects.length;

    const activeProjects = allProjects.filter(
      (p) => p.status === "in-progress",
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const projectsNearingDeadline = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline >= today &&
        deadline <= sevenDaysFromNow &&
        p.status !== "completed" &&
        p.status !== "cancelled"
      );
    }).length;

    const overdueProjects = allProjects.filter((p) => {
      if (!p.deadlineDate) return false;
      const deadline = new Date(p.deadlineDate);
      return (
        deadline < today && p.status !== "completed" && p.status !== "cancelled"
      );
    }).length;

    // Status distribution
    const statusDistribution = {
      "in-progress": 0,
      "waiting-to-start": 0,
      completed: 0,
      cancelled: 0,
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
        return (
          deadline >= today &&
          deadline <= sevenDaysFromNow &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
      });

    // Get overdue projects
    const overdueProjectsList = allProjects
      .filter((p) => {
        if (!p.deadlineDate) return false;
        const deadline = new Date(p.deadlineDate);
        return (
          deadline < today &&
          p.status !== "completed" &&
          p.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        if (!a.deadlineDate || !b.deadlineDate) return 0;
        return (
          new Date(a.deadlineDate).getTime() -
          new Date(b.deadlineDate).getTime()
        );
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
      urgentProjects: urgentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      overdueProjects: overdueProjectsList.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
      recentProjects: recentProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
    };
  });

// Get Filtered Projects for Admin - For admins to see all projects
export const getAdminFilteredProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
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
    // Verify user is admin or sales-finance
    if (
      context.user.role !== "admin" &&
      context.user.role !== "sales-finance"
    ) {
      throw new Error("Unauthorized: Admin or Sales-Finance access required");
    }

    const { page, limit, filter } = data;
    const offset = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get all projects across the system
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
      projects: paginatedProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
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

// Get Filtered Projects for Team Member - For authenticated team members
export const getTeamMemberFilteredProjectsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
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

    // Get all projects where user is assigned to at least one task
    const userTaskAssignments2 = await db
      .select({
        taskId: projectTaskAssignees.taskId,
      })
      .from(projectTaskAssignees)
      .where(eq(projectTaskAssignees.userId, userId));

    const taskIds = userTaskAssignments2.map((pta) => pta.taskId);

    if (taskIds.length === 0) {
      return {
        projects: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        counts: {
          all: 0,
          overdue: 0,
          nearing: 0,
          active: 0,
          completed: 0,
          "on-hold": 0,
        },
      };
    }

    // Get all tasks assigned to the user
    const assignedTasks = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
      })
      .from(projectTasks)
      .where(
        and(inArray(projectTasks.id, taskIds), isNull(projectTasks.deletedAt)),
      );

    const projectIds = [...new Set(assignedTasks.map((t) => t.projectId))];

    if (projectIds.length === 0) {
      return {
        projects: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        counts: {
          all: 0,
          overdue: 0,
          nearing: 0,
          active: 0,
          completed: 0,
          "on-hold": 0,
        },
      };
    }

    // Get all projects where user has assigned tasks
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
      .where(and(inArray(projects.id, projectIds), isNull(projects.deletedAt)))
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
      projects: paginatedProjects.map((p) => ({
        ...p,
        displayId: getProjectId(p.id),
      })),
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
