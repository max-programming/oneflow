import { db } from "@/db";
import { users, accounts, sessions } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, or, desc } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { adminOnly, authMiddleware } from "./auth-middleware";

export const getUsersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, adminOnly])
  .handler(async () => {
    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return {
      users: usersList,
    };
  });

export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      role: z.enum([
        "admin",
        "project-manager",
        "team-member",
        "sales-finance",
      ]),
    }),
  )
  .middleware([authMiddleware, adminOnly])
  .handler(async ({ data, context }) => {
    const currentUser = context.user;
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

export const updateUserFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      name: z.string().min(1, "Name is required").optional(),
      email: z.email().optional(),
      role: z
        .enum(["admin", "project-manager", "team-member", "sales-finance"])
        .optional(),
    }),
  )
  .middleware([authMiddleware, adminOnly])
  .handler(async ({ data }) => {
    const { userId, name, email, role } = data;

    // Check if email is already in use by another user
    if (email) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== userId) {
        throw new Error("Email already in use by another user");
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
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
      role: z
        .enum(["admin", "project-manager", "team-member", "sales-finance"])
        .default("team-member"),
    }),
  )
  .middleware([authMiddleware, adminOnly])
  .handler(async ({ data }) => {
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
    }),
  )
  .middleware([authMiddleware, adminOnly])
  .handler(async ({ data, context }) => {
    const currentUser = context.user;
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
