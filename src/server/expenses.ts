import { db } from "@/db";
import { expenses, projects, users } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
  salesFinanceOrAdmin,
} from "./auth-middleware";

// Helper function to generate next Expense number
async function generateNextExpenseNumber(): Promise<string> {
  const lastExpense = await db
    .select({ expenseNumber: expenses.expenseNumber })
    .from(expenses)
    .where(isNull(expenses.deletedAt))
    .orderBy(desc(expenses.createdAt))
    .limit(1);

  if (lastExpense.length === 0) {
    return "EXP-001";
  }

  const lastNumber = parseInt(lastExpense[0].expenseNumber.split("-")[1]);
  const nextNumber = lastNumber + 1;
  return `EXP-${nextNumber.toString().padStart(3, "0")}`;
}

// Helper function to calculate total amount
function calculateTotal(amount: string, taxPercentage: string): string {
  const baseAmount = parseFloat(amount);
  const tax = parseFloat(taxPercentage);
  const totalAmount = baseAmount + (baseAmount * tax) / 100;
  return totalAmount.toFixed(2);
}

// Create Expense - All authenticated users can create
export const createExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid().optional().nullable(),
      description: z.string().min(1, "Description is required"),
      category: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      taxPercentage: z.string().default("0"),
      expenseDate: z.string().min(1, "Expense date is required"),
      billable: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Generate next Expense number
    const expenseNumber = await generateNextExpenseNumber();

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    const [expense] = await db
      .insert(expenses)
      .values({
        expenseNumber,
        projectId: data.projectId,
        userId,
        description: data.description,
        category: data.category,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        expenseDate: data.expenseDate,
        billable: data.billable,
        approvalStatus: "pending",
      })
      .returning();

    if (!expense) {
      throw new Error("Failed to create expense");
    }

    return expense;
  });

// Get All Expenses - All authenticated users can view (excluding deleted)
export const getExpensesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.uuid().optional(),
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        userId: z.uuid().optional(), // Filter by user who submitted
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const conditions = [isNull(expenses.deletedAt)];

    if (data?.projectId) {
      conditions.push(eq(expenses.projectId, data.projectId));
    }

    if (data?.approvalStatus) {
      conditions.push(eq(expenses.approvalStatus, data.approvalStatus));
    }

    if (data?.userId) {
      conditions.push(eq(expenses.userId, data.userId));
    }

    const allExpenses = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        projectId: expenses.projectId,
        projectName: projects.name,
        userId: expenses.userId,
        userName: users.name,
        userEmail: users.email,
        description: expenses.description,
        category: expenses.category,
        amount: expenses.amount,
        taxPercentage: expenses.taxPercentage,
        totalAmount: expenses.totalAmount,
        expenseDate: expenses.expenseDate,
        billable: expenses.billable,
        approvalStatus: expenses.approvalStatus,
        approvedBy: expenses.approvedBy,
        approvedByName: sql<
          string | null
        >`(SELECT name FROM users WHERE id = ${expenses.approvedBy})`,
        approvedAt: expenses.approvedAt,
        notes: expenses.notes,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));

    return allExpenses;
  });

// Get Expense by ID - All authenticated users can view
export const getExpenseByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [expense] = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        projectId: expenses.projectId,
        projectName: projects.name,
        userId: expenses.userId,
        userName: users.name,
        userEmail: users.email,
        description: expenses.description,
        category: expenses.category,
        amount: expenses.amount,
        taxPercentage: expenses.taxPercentage,
        totalAmount: expenses.totalAmount,
        expenseDate: expenses.expenseDate,
        billable: expenses.billable,
        approvalStatus: expenses.approvalStatus,
        approvedBy: expenses.approvedBy,
        approvedByName: sql<
          string | null
        >`(SELECT name FROM users WHERE id = ${expenses.approvedBy})`,
        approvedAt: expenses.approvedAt,
        notes: expenses.notes,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(and(eq(expenses.id, data.expenseId), isNull(expenses.deletedAt)))
      .limit(1);

    if (!expense) {
      throw new Error("Expense not found");
    }

    return expense;
  });

// Update Expense - User can update their own expense if pending, Admin can update any
export const updateExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
      projectId: z.uuid().optional().nullable(),
      description: z.string().optional(),
      category: z.string().optional(),
      amount: z.string().optional(),
      taxPercentage: z.string().optional(),
      expenseDate: z.string().optional(),
      billable: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { expenseId, ...updateData } = data;
    const userId = context.user.id;
    const userRole = context.user.role;

    // Fetch the expense to check ownership and status
    const [currentExpense] = await db
      .select({
        userId: expenses.userId,
        approvalStatus: expenses.approvalStatus,
        amount: expenses.amount,
        taxPercentage: expenses.taxPercentage,
      })
      .from(expenses)
      .where(eq(expenses.id, expenseId))
      .limit(1);

    if (!currentExpense) {
      throw new Error("Expense not found");
    }

    // Only the user who created it can update if pending, or admin
    if (
      currentExpense.userId !== userId &&
      userRole !== "admin" &&
      userRole !== "sales-finance"
    ) {
      throw new Error("You can only update your own expenses");
    }

    // Cannot update approved/rejected expenses (except admin)
    if (
      currentExpense.approvalStatus !== "pending" &&
      userRole !== "admin" &&
      userRole !== "sales-finance"
    ) {
      throw new Error("Cannot update expense that has been approved/rejected");
    }

    // If amount or tax is being updated, recalculate total
    if (updateData.amount || updateData.taxPercentage) {
      const finalAmount = updateData.amount || currentExpense.amount;
      const finalTax = updateData.taxPercentage || currentExpense.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);

      const [updatedExpense] = await db
        .update(expenses)
        .set({ ...updateData, totalAmount })
        .where(eq(expenses.id, expenseId))
        .returning();

      if (!updatedExpense) {
        throw new Error("Failed to update expense");
      }

      return updatedExpense;
    }

    const [updatedExpense] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, expenseId))
      .returning();

    if (!updatedExpense) {
      throw new Error("Failed to update expense");
    }

    return updatedExpense;
  });

// Approve Expense - Project Manager or Admin can approve
export const approveExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Check if expense exists and is pending
    const [currentExpense] = await db
      .select({ approvalStatus: expenses.approvalStatus })
      .from(expenses)
      .where(eq(expenses.id, data.expenseId))
      .limit(1);

    if (!currentExpense) {
      throw new Error("Expense not found");
    }

    if (currentExpense.approvalStatus !== "pending") {
      throw new Error(
        `Expense has already been ${currentExpense.approvalStatus}`,
      );
    }

    const [approvedExpense] = await db
      .update(expenses)
      .set({
        approvalStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes,
      })
      .where(eq(expenses.id, data.expenseId))
      .returning();

    if (!approvedExpense) {
      throw new Error("Failed to approve expense");
    }

    return approvedExpense;
  });

// Reject Expense - Project Manager or Admin can reject
export const rejectExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
      notes: z.string().min(1, "Rejection reason is required"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Check if expense exists and is pending
    const [currentExpense] = await db
      .select({ approvalStatus: expenses.approvalStatus })
      .from(expenses)
      .where(eq(expenses.id, data.expenseId))
      .limit(1);

    if (!currentExpense) {
      throw new Error("Expense not found");
    }

    if (currentExpense.approvalStatus !== "pending") {
      throw new Error(
        `Expense has already been ${currentExpense.approvalStatus}`,
      );
    }

    const [rejectedExpense] = await db
      .update(expenses)
      .set({
        approvalStatus: "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes,
      })
      .where(eq(expenses.id, data.expenseId))
      .returning();

    if (!rejectedExpense) {
      throw new Error("Failed to reject expense");
    }

    return rejectedExpense;
  });

// Delete Expense (Soft Delete) - User can delete their own pending expenses, Admin can delete any
export const deleteExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const userRole = context.user.role;

    // Fetch the expense to check ownership and status
    const [currentExpense] = await db
      .select({
        userId: expenses.userId,
        approvalStatus: expenses.approvalStatus,
      })
      .from(expenses)
      .where(eq(expenses.id, data.expenseId))
      .limit(1);

    if (!currentExpense) {
      throw new Error("Expense not found");
    }

    // Only the user who created it can delete if pending, or admin
    if (
      currentExpense.userId !== userId &&
      userRole !== "admin" &&
      userRole !== "sales-finance"
    ) {
      throw new Error("You can only delete your own expenses");
    }

    // Cannot delete approved expenses (except admin)
    if (
      currentExpense.approvalStatus === "approved" &&
      userRole !== "admin" &&
      userRole !== "sales-finance"
    ) {
      throw new Error("Cannot delete approved expense");
    }

    const [deletedExpense] = await db
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(expenses.id, data.expenseId), isNull(expenses.deletedAt)))
      .returning();

    if (!deletedExpense) {
      throw new Error("Expense not found");
    }

    return { success: true, message: "Expense deleted successfully" };
  });

// Link Expense to Project
export const linkExpenseToProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ projectId: data.projectId })
      .where(eq(expenses.id, data.expenseId))
      .returning();

    if (!updatedExpense) {
      throw new Error("Failed to link expense to project");
    }

    return updatedExpense;
  });

// Unlink Expense from Project
export const unlinkExpenseFromProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.uuid("Invalid expense ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ projectId: null })
      .where(eq(expenses.id, data.expenseId))
      .returning();

    if (!updatedExpense) {
      throw new Error("Failed to unlink expense from project");
    }

    return updatedExpense;
  });
