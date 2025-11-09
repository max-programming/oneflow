import { db } from "@/db";
import { UserRole, users } from "@/db/schema";
import {
  projectTaskAssignees,
  projectTasks,
  projectTaskTimesheets,
  projects,
} from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
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
      projectId: z.number("Invalid project ID"),
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      startDate: z.string(),
      dueDate: z.string(),
      assigneeIds: z
        .array(z.number("Invalid assignee ID"))
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
      projectId: z.number("Invalid project ID"),
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
        number,
        Array<{
          userId: number;
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
      taskId: z.number("Invalid task ID"),
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
      taskId: z.number("Invalid task ID"),
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
      taskId: z.number("Invalid task ID"),
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
      taskId: z.number("Invalid task ID"),
      userId: z.number("Invalid user ID"),
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
      taskId: z.number("Invalid task ID"),
      userId: z.number("Invalid user ID"),
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
      taskId: z.number("Invalid task ID"),
    }),
  )
  .handler(async ({ data }) => {
    const assignees = await db
      .select({
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
      projectId: z.number("Invalid project ID"),
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

    // Ensure startTime and endTime are Date objects
    const processedTimesheets = timesheets.map((ts) => ({
      startTime: new Date(ts.startTime),
      endTime: new Date(ts.endTime),
    }));

    // Calculate total hours
    const totalMinutes = processedTimesheets.reduce((total, timesheet) => {
      const start = timesheet.startTime;
      const end = timesheet.endTime;
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
      projectId: z.number("Invalid project ID"),
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
          sql`${projectTaskTimesheets.startTime} >= ${sevenDaysAgo.toISOString()}`,
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

    // Ensure hours are numbers, not Date objects
    Object.keys(hoursByDay).forEach((day) => {
      if (typeof hoursByDay[day] !== "number") {
        hoursByDay[day] = 0;
      }
    });

    return Object.entries(hoursByDay).map(([day, hours]) => ({
      day,
      hours: Math.round(hours * 10) / 10, // Round to 1 decimal place
    }));
  });

// Get Project Statistics - All authenticated users can view
export const getProjectStatisticsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    // Get all tasks for the project (excluding soft deleted)
    const tasks = await db
      .select({
        id: projectTasks.id,
        status: projectTasks.status,
      })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, data.projectId),
          isNull(projectTasks.deletedAt),
        ),
      );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "done",
    ).length;
    const openTasks = totalTasks - completedTasks;
    const progress =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 10000) / 100
        : 0;

    // Get project dates to calculate total days
    const [project] = await db
      .select({
        startDate: projects.startDate,
        deadlineDate: projects.deadlineDate,
      })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1);

    let totalDays = 0;
    if (project?.startDate && project?.deadlineDate) {
      const start = new Date(project.startDate);
      const deadline = new Date(project.deadlineDate);
      const diffTime = deadline.getTime() - start.getTime();
      totalDays =
        diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
    }

    return {
      totalTasks,
      completedTasks,
      openTasks,
      progress, // Already rounded above
      totalDays,
    };
  });

async function verifyProjectManager(
  userId: number,
  userRole: UserRole,
  managerId: number,
) {
  if (userId !== managerId && userRole !== "admin") {
    throw new Error(
      "Only the project manager or admin can add or modify tasks and assignees",
    );
  }
}

// Get All Tasks for Project Manager - For authenticated PMs
export const getProjectManagerTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const { page, limit } = data;
    const offset = (page - 1) * limit;

    // Get all tasks for projects managed by the PM
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projects.managerId, userId),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projectTasks.dueDate));

    const totalCount = allTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = allTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    return {
      tasks: tasksWithAssignees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });

// Get Admin Tasks - For admins to see all system tasks
export const getAdminTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
    }),
  )
  .handler(async ({ context, data }) => {
    // Verify user is admin
    if (context.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { page, limit } = data;
    const offset = (page - 1) * limit;

    // Get all tasks across the entire system
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(isNull(projectTasks.deletedAt), isNull(projects.deletedAt)))
      .orderBy(desc(projectTasks.dueDate));

    const totalCount = allTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = allTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    return {
      tasks: tasksWithAssignees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });

// Get Team Member Tasks - For authenticated team members
export const getTeamMemberTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const { page, limit } = data;
    const offset = (page - 1) * limit;

    // Get all tasks assigned to the user
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(
        projectTaskAssignees,
        eq(projectTasks.id, projectTaskAssignees.taskId),
      )
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projectTaskAssignees.userId, userId),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projectTasks.dueDate));

    const totalCount = allTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = allTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    return {
      tasks: tasksWithAssignees,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });

// Update Task Status - Project Managers and Admins
export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, teamMemberAccess])
  .inputValidator(
    z.object({
      taskId: z.number("Invalid task ID"),
      status: z.enum(["waiting-to-start", "in-progress", "stuck", "done"]),
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
    if (
      session.user.id !== project.managerId &&
      session.user.role !== "admin" &&
      session.user.role !== "team-member"
    ) {
      throw new Error("You are not authorized to update this task");
    }

    if (session.user.role === "team-member") {
      const [assigneeId] = await db
        .select({ assigneeId: projectTaskAssignees.userId })
        .from(projectTaskAssignees)
        .where(
          and(
            eq(projectTaskAssignees.taskId, data.taskId),
            eq(projectTaskAssignees.userId, session.user.id),
          ),
        );

      if (!assigneeId) {
        throw new Error("You are not authorized to update this task");
      }
    }

    const [updatedTask] = await db
      .update(projectTasks)
      .set({ status: data.status })
      .where(eq(projectTasks.id, data.taskId))
      .returning();

    if (!updatedTask) {
      throw new Error("Failed to update task status");
    }

    return updatedTask;
  });

// Get Filtered Project Manager Tasks - For PMs with filtering options
export const getFilteredProjectManagerTasksFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      filter: z
        .enum([
          "all",
          "overdue",
          "today",
          "next-7-days",
          "upcoming",
          "completed",
        ])
        .default("all"),
    }),
  )
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { page, limit, filter } = data;
    const offset = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = `${sevenDaysFromNow.getFullYear()}-${String(sevenDaysFromNow.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysFromNow.getDate()).padStart(2, "0")}`;

    // Get all tasks for projects managed by the PM
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projects.managerId, userId),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projectTasks.dueDate));

    // Apply filters
    let filteredTasks = allTasks;
    if (filter === "overdue") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "today") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "next-7-days") {
      filteredTasks = allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      );
    } else if (filter === "upcoming") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "completed") {
      filteredTasks = allTasks.filter((t) => t.taskStatus === "done");
    }

    const totalCount = filteredTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    // Calculate counts for all filters
    const counts = {
      all: allTasks.length,
      overdue: allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      ).length,
      today: allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      ).length,
      "next-7-days": allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      ).length,
      upcoming: allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      ).length,
      completed: allTasks.filter((t) => t.taskStatus === "done").length,
    };

    return {
      tasks: tasksWithAssignees,
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

// Get Today's Tasks for Project Manager - For authenticated PMs
export const getProjectManagerTodaysTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get all tasks due today OR overdue for projects managed by the PM (not done)
    const todaysTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projects.managerId, userId),
          or(
            eq(projectTasks.dueDate, todayStr),
            lt(projectTasks.dueDate, todayStr),
          ),
          ne(projectTasks.status, "done"),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(projectTasks.dueDate);

    // Get assignees for each task
    const tasksWithAssignees = await Promise.all(
      todaysTasks.map(async (task) => {
        const assignees = await db
          .select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userRole: users.role,
          })
          .from(projectTaskAssignees)
          .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
          .where(eq(projectTaskAssignees.taskId, task.taskId));

        return {
          ...task,
          assignees,
        };
      }),
    );

    return tasksWithAssignees;
  });

// Get Filtered Admin Tasks - For admins with filtering options
export const getFilteredAdminTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      filter: z
        .enum([
          "all",
          "overdue",
          "today",
          "next-7-days",
          "upcoming",
          "completed",
        ])
        .default("all"),
    }),
  )
  .handler(async ({ context, data }) => {
    // Verify user is admin
    if (context.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { page, limit, filter } = data;
    const offset = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = `${sevenDaysFromNow.getFullYear()}-${String(sevenDaysFromNow.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysFromNow.getDate()).padStart(2, "0")}`;

    // Get all tasks across the system
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(isNull(projectTasks.deletedAt), isNull(projects.deletedAt)))
      .orderBy(desc(projectTasks.dueDate));

    // Apply filters
    let filteredTasks = allTasks;
    if (filter === "overdue") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "today") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "next-7-days") {
      filteredTasks = allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      );
    } else if (filter === "upcoming") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "completed") {
      filteredTasks = allTasks.filter((t) => t.taskStatus === "done");
    }

    const totalCount = filteredTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    // Calculate counts for all filters
    const counts = {
      all: allTasks.length,
      overdue: allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      ).length,
      today: allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      ).length,
      "next-7-days": allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      ).length,
      upcoming: allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      ).length,
      completed: allTasks.filter((t) => t.taskStatus === "done").length,
    };

    return {
      tasks: tasksWithAssignees,
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

// Get Admin Today's Tasks - For admins to see all system tasks
export const getAdminTodaysTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async ({ context }) => {
    // Verify user is admin
    if (context.user.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get all tasks due today OR overdue across the entire system (not done)
    const todaysTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          or(
            eq(projectTasks.dueDate, todayStr),
            lt(projectTasks.dueDate, todayStr),
          ),
          ne(projectTasks.status, "done"),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(projectTasks.dueDate);

    // Get assignees for each task
    const tasksWithAssignees = await Promise.all(
      todaysTasks.map(async (task) => {
        const assignees = await db
          .select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userRole: users.role,
          })
          .from(projectTaskAssignees)
          .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
          .where(eq(projectTaskAssignees.taskId, task.taskId));

        return {
          ...task,
          assignees,
        };
      }),
    );

    return tasksWithAssignees;
  });

// Get Filtered Team Member Tasks - For team members with filtering options
export const getFilteredTeamMemberTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      filter: z
        .enum([
          "all",
          "overdue",
          "today",
          "next-7-days",
          "upcoming",
          "completed",
        ])
        .default("all"),
    }),
  )
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { page, limit, filter } = data;
    const offset = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = `${sevenDaysFromNow.getFullYear()}-${String(sevenDaysFromNow.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysFromNow.getDate()).padStart(2, "0")}`;

    // Get all tasks assigned to the user
    const allTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        taskCreatedAt: projectTasks.createdAt,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(
        projectTaskAssignees,
        eq(projectTasks.id, projectTaskAssignees.taskId),
      )
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projectTaskAssignees.userId, userId),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projectTasks.dueDate));

    // Apply filters
    let filteredTasks = allTasks;
    if (filter === "overdue") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "today") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "next-7-days") {
      filteredTasks = allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      );
    } else if (filter === "upcoming") {
      filteredTasks = allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      );
    } else if (filter === "completed") {
      filteredTasks = allTasks.filter((t) => t.taskStatus === "done");
    }

    const totalCount = filteredTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    // Get assignees for the paginated tasks
    const taskIds = paginatedTasks.map((task) => task.taskId);

    const assignees =
      taskIds.length > 0
        ? await db
            .select({
              taskId: projectTaskAssignees.taskId,
              userId: users.id,
              userName: users.name,
              userEmail: users.email,
              userRole: users.role,
            })
            .from(projectTaskAssignees)
            .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
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
          userRole: assignee.userRole,
        });
        return acc;
      },
      {} as Record<
        number,
        Array<{
          userId: number;
          userName: string | null;
          userEmail: string | null;
          userRole: string | null;
        }>
      >,
    );

    // Attach assignees to tasks
    const tasksWithAssignees = paginatedTasks.map((task) => ({
      ...task,
      assignees: assigneesByTask[task.taskId] || [],
    }));

    // Calculate counts for all filters
    const counts = {
      all: allTasks.length,
      overdue: allTasks.filter(
        (t) => t.taskDueDate < todayStr && t.taskStatus !== "done",
      ).length,
      today: allTasks.filter(
        (t) => t.taskDueDate === todayStr && t.taskStatus !== "done",
      ).length,
      "next-7-days": allTasks.filter(
        (t) =>
          t.taskDueDate >= todayStr &&
          t.taskDueDate <= sevenDaysStr &&
          t.taskStatus !== "done",
      ).length,
      upcoming: allTasks.filter(
        (t) => t.taskDueDate > todayStr && t.taskStatus !== "done",
      ).length,
      completed: allTasks.filter((t) => t.taskStatus === "done").length,
    };

    return {
      tasks: tasksWithAssignees,
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

// Get Team Member Today's Tasks - For authenticated team members
export const getTeamMemberTodaysTasksFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async ({ context }) => {
    const userId = context.user.id;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Convert today to YYYY-MM-DD format
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get all tasks assigned to the user that are due today OR overdue (not done)
    const todaysTasks = await db
      .select({
        taskId: projectTasks.id,
        taskName: projectTasks.name,
        taskDescription: projectTasks.description,
        taskStatus: projectTasks.status,
        taskStartDate: projectTasks.startDate,
        taskDueDate: projectTasks.dueDate,
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(projectTasks)
      .innerJoin(
        projectTaskAssignees,
        eq(projectTasks.id, projectTaskAssignees.taskId),
      )
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projectTaskAssignees.userId, userId),
          or(
            eq(projectTasks.dueDate, todayStr),
            lt(projectTasks.dueDate, todayStr),
          ),
          ne(projectTasks.status, "done"),
          isNull(projectTasks.deletedAt),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(projectTasks.dueDate);

    console.log({ todayStr });

    // Get assignees for each task
    const tasksWithAssignees = await Promise.all(
      todaysTasks.map(async (task) => {
        const assignees = await db
          .select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userRole: users.role,
          })
          .from(projectTaskAssignees)
          .innerJoin(users, eq(projectTaskAssignees.userId, users.id))
          .where(eq(projectTaskAssignees.taskId, task.taskId));

        return {
          ...task,
          assignees,
        };
      }),
    );

    return tasksWithAssignees;
  });
