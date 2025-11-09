import { db } from "@/db";
import {
  projects,
  purchaseOrders,
  users,
  vendorBills,
  vendors,
} from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  salesFinanceOrAdmin,
} from "./auth-middleware";
import {
  validateStatusTransition,
  canEditDocument,
} from "@/lib/financial-utils";

// Helper function to calculate total amount
function calculateTotal(amount: string, taxPercentage: string): string {
  const baseAmount = parseFloat(amount);
  const tax = parseFloat(taxPercentage);
  const totalAmount = baseAmount + (baseAmount * tax) / 100;
  return totalAmount.toFixed(2);
}

// Create Vendor Bill - Sales/Finance and Admins can create
export const createVendorBillFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.number().optional().nullable(),
      vendorId: z.number().int().positive("Vendor is required"),
      purchaseOrderId: z.number().int().positive().optional().nullable(),
      description: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      taxPercentage: z.string().default("0"),
      billDate: z.string().min(1, "Bill date is required"),
      dueDate: z.string().min(1, "Due date is required"),
      status: z.enum(["draft", "sent", "paid", "cancelled"]).default("draft"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    // Insert first with a temporary bill number
    const [bill] = await db
      .insert(vendorBills)
      .values({
        billNumber: "TEMP", // Temporary, will be updated
        projectId: data.projectId,
        vendorId: data.vendorId,
        purchaseOrderId: data.purchaseOrderId ?? undefined,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        billDate: data.billDate,
        dueDate: data.dueDate,
        status: data.status,
        createdBy: userId,
      })
      .returning();

    if (!bill) {
      throw new Error("Failed to create vendor bill");
    }

    // Update with actual bill number based on ID
    const billNumber = `BILL-${bill.id.toString().padStart(3, "0")}`;
    const [updatedBill] = await db
      .update(vendorBills)
      .set({ billNumber })
      .where(eq(vendorBills.id, bill.id))
      .returning();

    return updatedBill;
  });

// Get All Vendor Bills - All authenticated users can view (excluding deleted)
export const getVendorBillsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const conditions = [isNull(vendorBills.deletedAt)];

    if (data?.projectId) {
      conditions.push(eq(vendorBills.projectId, data.projectId));
    }

    const allBills = await db
      .select({
        id: vendorBills.id,
        billNumber: vendorBills.billNumber,
        projectId: vendorBills.projectId,
        projectName: projects.name,
        vendorId: vendorBills.vendorId,
        vendorName: vendors.name,
        purchaseOrderId: vendorBills.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.poNumber,
        description: vendorBills.description,
        amount: vendorBills.amount,
        taxPercentage: vendorBills.taxPercentage,
        totalAmount: vendorBills.totalAmount,
        billDate: vendorBills.billDate,
        dueDate: vendorBills.dueDate,
        status: vendorBills.status,
        createdBy: vendorBills.createdBy,
        createdByName: users.name,
        createdAt: vendorBills.createdAt,
        updatedAt: vendorBills.updatedAt,
      })
      .from(vendorBills)
      .leftJoin(vendors, eq(vendorBills.vendorId, vendors.id))
      .leftJoin(projects, eq(vendorBills.projectId, projects.id))
      .leftJoin(
        purchaseOrders,
        eq(vendorBills.purchaseOrderId, purchaseOrders.id),
      )
      .leftJoin(users, eq(vendorBills.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(vendorBills.createdAt));

    return allBills;
  });

// Get Vendor Bill by ID - All authenticated users can view
export const getVendorBillByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      billId: z.number().int().positive("Invalid bill ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [bill] = await db
      .select({
        id: vendorBills.id,
        billNumber: vendorBills.billNumber,
        projectId: vendorBills.projectId,
        projectName: projects.name,
        vendorId: vendorBills.vendorId,
        vendorName: vendors.name,
        vendorEmail: vendors.email,
        purchaseOrderId: vendorBills.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.poNumber,
        description: vendorBills.description,
        amount: vendorBills.amount,
        taxPercentage: vendorBills.taxPercentage,
        totalAmount: vendorBills.totalAmount,
        billDate: vendorBills.billDate,
        dueDate: vendorBills.dueDate,
        status: vendorBills.status,
        createdBy: vendorBills.createdBy,
        createdByName: users.name,
        createdAt: vendorBills.createdAt,
        updatedAt: vendorBills.updatedAt,
      })
      .from(vendorBills)
      .leftJoin(vendors, eq(vendorBills.vendorId, vendors.id))
      .leftJoin(projects, eq(vendorBills.projectId, projects.id))
      .leftJoin(
        purchaseOrders,
        eq(vendorBills.purchaseOrderId, purchaseOrders.id),
      )
      .leftJoin(users, eq(vendorBills.createdBy, users.id))
      .where(
        and(eq(vendorBills.id, data.billId), isNull(vendorBills.deletedAt)),
      )
      .limit(1);

    if (!bill) {
      throw new Error("Vendor bill not found");
    }

    return bill;
  });

// Update Vendor Bill - Sales/Finance and Admins can update
export const updateVendorBillFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.number().int().positive("Invalid bill ID"),
      projectId: z.number().optional().nullable(),
      vendorId: z.number().int().positive().optional(),
      purchaseOrderId: z.number().int().positive().optional().nullable(),
      description: z.string().optional(),
      amount: z.string().optional(),
      taxPercentage: z.string().optional(),
      billDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { billId, ...updateData } = data;

    // Clean update data: convert null to undefined for optional foreign keys
    const cleanedData: any = { ...updateData };
    if (cleanedData.purchaseOrderId === null) {
      cleanedData.purchaseOrderId = undefined;
    }

    // Validate status transitions if status is being updated
    if (cleanedData.status) {
      const [current] = await db
        .select({
          status: vendorBills.status,
        })
        .from(vendorBills)
        .where(eq(vendorBills.id, billId))
        .limit(1);

      if (!current) {
        throw new Error("Vendor bill not found");
      }

      // Validate the status transition
      validateStatusTransition(current.status, cleanedData.status);
    }

    // Prevent editing paid or cancelled bills (except status field)
    if (Object.keys(cleanedData).length > 0 && !cleanedData.status) {
      const [current] = await db
        .select({ status: vendorBills.status })
        .from(vendorBills)
        .where(eq(vendorBills.id, billId))
        .limit(1);

      if (current && !canEditDocument(current.status)) {
        throw new Error(`Cannot edit ${current.status} bill`);
      }
    }

    // If amount or tax is being updated, recalculate total
    if (cleanedData.amount || cleanedData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: vendorBills.amount,
          taxPercentage: vendorBills.taxPercentage,
        })
        .from(vendorBills)
        .where(eq(vendorBills.id, billId))
        .limit(1);

      if (!current) {
        throw new Error("Vendor bill not found");
      }

      const finalAmount = cleanedData.amount || current.amount;
      const finalTax = cleanedData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);

      const [updatedBill] = await db
        .update(vendorBills)
        .set({ ...cleanedData, totalAmount })
        .where(eq(vendorBills.id, billId))
        .returning();

      if (!updatedBill) {
        throw new Error("Failed to update vendor bill");
      }

      return updatedBill;
    }

    const [updatedBill] = await db
      .update(vendorBills)
      .set(cleanedData)
      .where(eq(vendorBills.id, billId))
      .returning();

    if (!updatedBill) {
      throw new Error("Failed to update vendor bill");
    }

    return updatedBill;
  });

// Delete Vendor Bill (Soft Delete) - Sales/Finance and Admins can delete
export const deleteVendorBillFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.number().int().positive("Invalid bill ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedBill] = await db
      .update(vendorBills)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(vendorBills.id, data.billId), isNull(vendorBills.deletedAt)),
      )
      .returning();

    if (!deletedBill) {
      throw new Error("Vendor bill not found");
    }

    return { success: true, message: "Vendor bill deleted successfully" };
  });

// Link Vendor Bill to Project
export const linkVendorBillToProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.number().int().positive("Invalid bill ID"),
      projectId: z.number("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedBill] = await db
      .update(vendorBills)
      .set({ projectId: data.projectId })
      .where(eq(vendorBills.id, data.billId))
      .returning();

    if (!updatedBill) {
      throw new Error("Failed to link vendor bill to project");
    }

    return updatedBill;
  });

// Unlink Vendor Bill from Project
export const unlinkVendorBillFromProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.number().int().positive("Invalid bill ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedBill] = await db
      .update(vendorBills)
      .set({ projectId: null })
      .where(eq(vendorBills.id, data.billId))
      .returning();

    if (!updatedBill) {
      throw new Error("Failed to unlink vendor bill from project");
    }

    return updatedBill;
  });

// Get Project Vendor Bills - Get vendor bills for a specific project (for financial links)
export const getProjectVendorBillsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
      limit: z.number().optional().default(5),
    }),
  )
  .handler(async ({ data }) => {
    const projectBills = await db
      .select({
        id: vendorBills.id,
        billNumber: vendorBills.billNumber,
        vendorId: vendorBills.vendorId,
        vendorName: vendors.name,
        description: vendorBills.description,
        amount: vendorBills.amount,
        taxPercentage: vendorBills.taxPercentage,
        totalAmount: vendorBills.totalAmount,
        billDate: vendorBills.billDate,
        dueDate: vendorBills.dueDate,
        status: vendorBills.status,
        createdAt: vendorBills.createdAt,
      })
      .from(vendorBills)
      .leftJoin(vendors, eq(vendorBills.vendorId, vendors.id))
      .where(
        and(
          eq(vendorBills.projectId, data.projectId),
          isNull(vendorBills.deletedAt),
        ),
      )
      .orderBy(desc(vendorBills.createdAt))
      .limit(data.limit);

    return projectBills;
  });
