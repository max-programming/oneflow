import { db } from "@/db";
import { users, accounts, sessions } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { eq, or, desc, asc, like, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/db/tables/auth";

// Helper function to get current user session and validate admin role
async function validateAdminAccess() {
  const token = getCookie("session_token");
  
  if (!token) {
    throw new Error("Unauthorized");
  }

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) {
    throw new Error("Invalid session");
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

export const getUsersFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      page: z.number().default(0),
      pageSize: z.number().default(10),
      search: z.string().optional(),
      sortBy: z.enum(["name", "email", "username", "role", "createdAt"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      roleFilter: z.enum(["admin", "project-manager", "team-member", "sales-finance", "all"]).default("all"),
    })
  )
  .handler(async ({ data }) => {
    await validateAdminAccess();

    const { page, pageSize, search, sortBy, sortOrder, roleFilter } = data;
    const offset = page * pageSize;

    // Build where conditions
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.username, `%${search}%`)
        )
      );
    }

    if (roleFilter !== "all") {
      whereConditions.push(eq(users.role, roleFilter));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Build order by
    const orderByClause = sortOrder === "asc" ? asc(users[sortBy]) : desc(users[sortBy]);

    // Get users with pagination
    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        emailVerified: users.emailVerified,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: users.id })
      .from(users)
      .where(whereClause);
    
    const total = totalResult.length;

    return {
      users: usersList,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      role: z.enum(["admin", "project-manager", "team-member", "sales-finance"]),
    })
  )
  .handler(async ({ data }) => {
    const currentUser = await validateAdminAccess();
    const { userId, role } = data;

    // Prevent admin from changing their own role
    if (currentUser.id === userId) {
      throw new Error("Cannot change your own role");
    }

    const [updatedUser] = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  });

export const updateUserStatusFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      emailVerified: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const currentUser = await validateAdminAccess();
    const { userId, emailVerified } = data;

    // Prevent admin from changing their own status
    if (currentUser.id === userId) {
      throw new Error("Cannot change your own status");
    }

    const [updatedUser] = await db
      .update(users)
      .set({ 
        emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
      });

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  });

export const createUserFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1, "Name is required"),
      email: z.email(),
      username: z.string().min(1, "Username is required").toLowerCase(),
      password: z.string().min(6, "Password must be at least 6 characters"),
      role: z.enum(["admin", "project-manager", "team-member", "sales-finance"]).default("team-member"),
    })
  )
  .handler(async ({ data }) => {
    await validateAdminAccess();
    
    const { name, email, username, password, role } = data;

    // Check if user already exists
    const existingUsers = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);

    if (existingUsers.length > 0) {
      if (existingUsers[0].email === email) {
        throw new Error("Email already in use");
      }
      if (existingUsers[0].username === username) {
        throw new Error("Username already in use");
      }
    }

    // Create user
    const [user] = await db
      .insert(users)
      .values({ 
        name, 
        email, 
        username, 
        role,
        emailVerified: true, // Admin-created users are verified by default
      })
      .returning({ 
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
      });

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Create account with hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(accounts).values({
      userId: user.id,
      password: hashedPassword,
    });

    return user;
  });

export const deleteUserFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const currentUser = await validateAdminAccess();
    const { userId } = data;

    // Prevent admin from deleting themselves
    if (currentUser.id === userId) {
      throw new Error("Cannot delete your own account");
    }

    // Check if user exists
    const [userToDelete] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Delete user's account first (due to foreign key constraint)
    await db.delete(accounts).where(eq(accounts.userId, userId));
    
    // Delete user's sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));
    
    // Delete user
    await db.delete(users).where(eq(users.id, userId));

    return { success: true, deletedUserId: userId };
  });
