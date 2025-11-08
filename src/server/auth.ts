import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { setCookie, getCookie } from "@tanstack/react-start/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateRandomString } from "@/lib/utils";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie("session_token");

    if (!token) {
      return null;
    }

    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!session) {
      throw new Error("Invalid token");
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

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  },
);

export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1, "Name is required"),
      email: z.email(),
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
    }),
  )
  .handler(async ({ data }) => {
    const { name, email, username, password } = data;

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

    const [user] = await db
      .insert(users)
      .values({ name, email, username })
      .returning({ id: users.id });

    if (!user) {
      throw new Error("Failed to create user");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(accounts).values({
      userId: user.id,
      password: hashedPassword,
    });

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        token: generateRandomString(32),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      })
      .returning({ token: sessions.token });

    setCookie("session_token", session.token);

    return {
      user: {
        id: user.id,
        name,
        email,
        username,
      },
    };
  });

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.email(),
      password: z.string().min(1, "Password is required"),
    }),
  )
  .handler(async ({ data }) => {
    const { email, password } = data;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        password: accounts.password,
      })
      .from(users)
      .innerJoin(accounts, eq(users.id, accounts.userId))
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        token: generateRandomString(32),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      })
      .returning({ token: sessions.token });

    setCookie("session_token", session.token);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    };
  });
