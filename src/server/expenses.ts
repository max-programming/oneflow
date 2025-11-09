import { db } from "@/db";
import { customerInvoices, expenses, projects, users } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  projectManagerOrAdmin,
  salesFinanceOrAdmin,
} from "./auth-middleware";

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
      projectId: z.number().optional().nullable(),
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

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    // Insert first with a temporary expense number
    const [expense] = await db
      .insert(expenses)
      .values({
        expenseNumber: "TEMP", // Temporary, will be updated
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

    // Update with actual expense number based on ID
    const expenseNumber = `EXP-${expense.id.toString().padStart(3, "0")}`;
    const [updatedExpense] = await db
      .update(expenses)
      .set({ expenseNumber })
      .where(eq(expenses.id, expense.id))
      .returning();

    return updatedExpense;
  });

// Get All Expenses - All authenticated users can view (excluding deleted)
export const getExpensesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.number().optional(),
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        userId: z.number().optional(), // Filter by user who submitted
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
        invoiceId: expenses.invoiceId,
        invoiceNumber: customerInvoices.invoiceNumber,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(customerInvoices, eq(expenses.invoiceId, customerInvoices.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));

    return allExpenses;
  });

// Get Expense by ID - All authenticated users can view
export const getExpenseByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      expenseId: z.number().int().positive("Invalid expense ID"),
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
        invoiceId: expenses.invoiceId,
        invoiceNumber: customerInvoices.invoiceNumber,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(customerInvoices, eq(expenses.invoiceId, customerInvoices.id))
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
      expenseId: z.number().int().positive("Invalid expense ID"),
      projectId: z.number().optional().nullable(),
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

// Approve Expense - Project Manager of the expense's project or Admin can approve
export const approveExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.number().int().positive("Invalid expense ID"),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const userRole = context.user.role;

    // Get expense with project details
    const [expense] = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        projectId: expenses.projectId,
        description: expenses.description,
        amount: expenses.amount,
        taxPercentage: expenses.taxPercentage,
        totalAmount: expenses.totalAmount,
        billable: expenses.billable,
        approvalStatus: expenses.approvalStatus,
        managerId: projects.managerId,
        customerId: projects.customerId,
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(eq(expenses.id, data.expenseId))
      .limit(1);

    if (!expense) {
      throw new Error("Expense not found");
    }

    if (expense.approvalStatus !== "pending") {
      throw new Error(`Expense has already been ${expense.approvalStatus}`);
    }

    // Verify user is the project manager or admin
    if (!expense.projectId) {
      throw new Error("Expense must be linked to a project before approval");
    }

    if (userRole !== "admin" && userId !== expense.managerId) {
      throw new Error(
        "Only the project manager or admin can approve this expense",
      );
    }

    let invoiceId: number | undefined;

    // If expense is billable, auto-create customer invoice
    if (expense.billable && expense.customerId) {
      const today = new Date().toISOString().split("T")[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Create customer invoice
      const [tempInvoice] = await db
        .insert(customerInvoices)
        .values({
          invoiceNumber: "TEMP", // Temporary, will be updated
          projectId: expense.projectId,
          customerId: expense.customerId,
          description: `Billable Expense - ${expense.expenseNumber}: ${expense.description}`,
          amount: expense.amount,
          taxPercentage: expense.taxPercentage,
          totalAmount: expense.totalAmount,
          invoiceDate: today,
          dueDate: dueDateStr,
          status: "draft",
          createdBy: userId,
        })
        .returning();

      if (tempInvoice) {
        // Update with actual invoice number based on ID
        const invoiceNumber = `INV-${tempInvoice.id.toString().padStart(3, "0")}`;
        const [createdInvoice] = await db
          .update(customerInvoices)
          .set({ invoiceNumber })
          .where(eq(customerInvoices.id, tempInvoice.id))
          .returning();

        invoiceId = createdInvoice?.id;
      }
    }

    // Approve the expense and link to invoice if created
    const [approvedExpense] = await db
      .update(expenses)
      .set({
        approvalStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes,
        ...(invoiceId && { invoiceId }),
      })
      .where(eq(expenses.id, data.expenseId))
      .returning();

    if (!approvedExpense) {
      throw new Error("Failed to approve expense");
    }

    return approvedExpense;
  });

// Reject Expense - Project Manager of the expense's project or Admin can reject
export const rejectExpenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, projectManagerOrAdmin])
  .inputValidator(
    z.object({
      expenseId: z.number().int().positive("Invalid expense ID"),
      notes: z.string().min(1, "Rejection reason is required"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const userRole = context.user.role;

    // Get expense with project details to verify PM
    const [expense] = await db
      .select({
        id: expenses.id,
        projectId: expenses.projectId,
        approvalStatus: expenses.approvalStatus,
        managerId: projects.managerId,
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(eq(expenses.id, data.expenseId))
      .limit(1);

    if (!expense) {
      throw new Error("Expense not found");
    }

    if (expense.approvalStatus !== "pending") {
      throw new Error(`Expense has already been ${expense.approvalStatus}`);
    }

    // Verify user is the project manager or admin
    if (!expense.projectId) {
      throw new Error("Expense must be linked to a project before rejection");
    }

    if (userRole !== "admin" && userId !== expense.managerId) {
      throw new Error(
        "Only the project manager or admin can reject this expense",
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
      expenseId: z.number().int().positive("Invalid expense ID"),
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
      expenseId: z.number().int().positive("Invalid expense ID"),
      projectId: z.number("Invalid project ID"),
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
      expenseId: z.number().int().positive("Invalid expense ID"),
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

// Get My Expenses - Current user's submitted expenses
export const getMyExpensesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        projectId: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const conditions = [
      isNull(expenses.deletedAt),
      eq(expenses.userId, userId),
    ];

    if (data?.approvalStatus) {
      conditions.push(eq(expenses.approvalStatus, data.approvalStatus));
    }

    if (data?.projectId) {
      conditions.push(eq(expenses.projectId, data.projectId));
    }

    const myExpenses = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        projectId: expenses.projectId,
        projectName: projects.name,
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
        invoiceId: expenses.invoiceId,
        invoiceNumber: customerInvoices.invoiceNumber,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(customerInvoices, eq(expenses.invoiceId, customerInvoices.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));

    return myExpenses;
  });

// Get Project Expenses - All expenses for a specific project
export const getProjectExpensesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
      approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const conditions = [
      isNull(expenses.deletedAt),
      eq(expenses.projectId, data.projectId),
    ];

    if (data.approvalStatus) {
      conditions.push(eq(expenses.approvalStatus, data.approvalStatus));
    }

    const projectExpenses = await db
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
        invoiceId: expenses.invoiceId,
        invoiceNumber: customerInvoices.invoiceNumber,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(customerInvoices, eq(expenses.invoiceId, customerInvoices.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));

    return projectExpenses;
  });

// Get Expenses Pending My Approval - For Project Managers
export const getExpensesPendingMyApprovalFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware, projectManagerOrAdmin])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    const userRole = context.user.role;

    // If admin, get all pending expenses
    // If PM, get only pending expenses from projects they manage
    const conditions = [
      isNull(expenses.deletedAt),
      eq(expenses.approvalStatus, "pending"),
    ];

    // For PMs, only show expenses from their managed projects
    if (userRole !== "admin") {
      conditions.push(eq(projects.managerId, userId));
    }

    const pendingExpenses = await db
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
        notes: expenses.notes,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.userId, users.id))
      .innerJoin(projects, eq(expenses.projectId, projects.id)) // INNER JOIN to ensure project exists
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt));

    return pendingExpenses;
  });
