import { createMiddleware } from "@tanstack/react-start";
import { getSessionFn } from "./auth";
import type { UserRole } from "@/db/tables/auth";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSessionFn();
    if (!session) {
      throw new UnauthorizedError("Unauthorized");
    }
    return next({ context: session });
  },
);

// Role-based middleware factory
export const roleMiddleware = (allowedRoles: UserRole[]) =>
  createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    // Context should have session from authMiddleware
    const session = (context ||
      (await getSessionFn())) as Awaited<ReturnType<typeof getSessionFn>>;

    if (!session || !session.user) {
      throw new UnauthorizedError("Unauthorized");
    }

    const userRole = session.user.role;

    // Admin has access to everything
    if (userRole === "admin") {
      return next({ context: session });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      );
    }

    return next({ context: session });
  });

// Convenience middleware for common role combinations
export const adminOnly = roleMiddleware(["admin"]);
export const projectManagerOrAdmin = roleMiddleware(["project-manager", "admin"]);
export const salesFinanceOrAdmin = roleMiddleware(["sales-finance", "admin"]);
export const teamMemberAccess = roleMiddleware([
  "team-member",
  "project-manager",
  "admin",
]);
export const allRoles = roleMiddleware([
  "admin",
  "project-manager",
  "team-member",
  "sales-finance",
]);

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
