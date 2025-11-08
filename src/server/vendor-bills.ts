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

// Helper function to generate next Bill number
async function generateNextBillNumber(): Promise<string> {
  const lastBill = await db
    .select({ billNumber: vendorBills.billNumber })
    .from(vendorBills)
    .where(isNull(vendorBills.deletedAt))
    .orderBy(desc(vendorBills.createdAt))
    .limit(1);

  if (lastBill.length === 0) {
    return "BILL-001";
  }

  const lastNumber = parseInt(lastBill[0].billNumber.split("-")[1]);
  const nextNumber = lastNumber + 1;
  return `BILL-${nextNumber.toString().padStart(3, "0")}`;
}

// Helper function to calculate total amount
function calculateTotal(amount: string, taxPercentage: string): string {
  const baseAmount = parseFloat(amount);
  const tax = parseFloat(taxPercentage);
  const totalAmount = baseAmount + (baseAmount * tax) / 100;
  return totalAmount.toFixed(2);
}

// Helper function to determine payment status
function determinePaymentStatus(
  totalAmount: string,
  paidAmount: string,
): "unpaid" | "partially_paid" | "fully_paid" {
  const total = parseFloat(totalAmount);
  const paid = parseFloat(paidAmount);

  if (paid === 0) return "unpaid";
  if (paid >= total) return "fully_paid";
  return "partially_paid";
}

// Create Vendor Bill - Sales/Finance and Admins can create
export const createVendorBillFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid().optional().nullable(),
      vendorId: z.uuid("Vendor is required"),
      purchaseOrderId: z.uuid().optional().nullable(),
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

    // Generate next Bill number
    const billNumber = await generateNextBillNumber();

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    const [bill] = await db
      .insert(vendorBills)
      .values({
        billNumber,
        projectId: data.projectId,
        vendorId: data.vendorId,
        purchaseOrderId: data.purchaseOrderId,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        billDate: data.billDate,
        dueDate: data.dueDate,
        paymentStatus: "unpaid",
        paidAmount: "0",
        status: data.status,
        createdBy: userId,
      })
      .returning();

    if (!bill) {
      throw new Error("Failed to create vendor bill");
    }

    return bill;
  });

// Get All Vendor Bills - All authenticated users can view (excluding deleted)
export const getVendorBillsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.uuid().optional(),
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
        paymentStatus: vendorBills.paymentStatus,
        paidAmount: vendorBills.paidAmount,
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
      billId: z.uuid("Invalid bill ID"),
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
        paymentStatus: vendorBills.paymentStatus,
        paidAmount: vendorBills.paidAmount,
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
      billId: z.uuid("Invalid bill ID"),
      projectId: z.uuid().optional().nullable(),
      vendorId: z.uuid().optional(),
      purchaseOrderId: z.uuid().optional().nullable(),
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

    // If amount or tax is being updated, recalculate total
    if (updateData.amount || updateData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: vendorBills.amount,
          taxPercentage: vendorBills.taxPercentage,
          paidAmount: vendorBills.paidAmount,
        })
        .from(vendorBills)
        .where(eq(vendorBills.id, billId))
        .limit(1);

      if (!current) {
        throw new Error("Vendor bill not found");
      }

      const finalAmount = updateData.amount || current.amount;
      const finalTax = updateData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);
      const paymentStatus = determinePaymentStatus(
        totalAmount,
        current.paidAmount,
      );

      const [updatedBill] = await db
        .update(vendorBills)
        .set({ ...updateData, totalAmount, paymentStatus })
        .where(eq(vendorBills.id, billId))
        .returning();

      if (!updatedBill) {
        throw new Error("Failed to update vendor bill");
      }

      return updatedBill;
    }

    const [updatedBill] = await db
      .update(vendorBills)
      .set(updateData)
      .where(eq(vendorBills.id, billId))
      .returning();

    if (!updatedBill) {
      throw new Error("Failed to update vendor bill");
    }

    return updatedBill;
  });

// Record Payment for Vendor Bill
export const recordVendorBillPaymentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.uuid("Invalid bill ID"),
      paymentAmount: z.string().min(1, "Payment amount is required"),
    }),
  )
  .handler(async ({ data }) => {
    // Fetch current bill
    const [current] = await db
      .select({
        totalAmount: vendorBills.totalAmount,
        paidAmount: vendorBills.paidAmount,
      })
      .from(vendorBills)
      .where(eq(vendorBills.id, data.billId))
      .limit(1);

    if (!current) {
      throw new Error("Vendor bill not found");
    }

    const currentPaid = parseFloat(current.paidAmount);
    const payment = parseFloat(data.paymentAmount);
    const newPaidAmount = (currentPaid + payment).toFixed(2);

    // Determine new payment status
    const paymentStatus = determinePaymentStatus(
      current.totalAmount,
      newPaidAmount,
    );

    // Update status to paid if fully paid
    const status =
      paymentStatus === "fully_paid" ? ("paid" as const) : undefined;

    const [updatedBill] = await db
      .update(vendorBills)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus,
        ...(status && { status }),
      })
      .where(eq(vendorBills.id, data.billId))
      .returning();

    if (!updatedBill) {
      throw new Error("Failed to record payment");
    }

    return updatedBill;
  });

// Delete Vendor Bill (Soft Delete) - Sales/Finance and Admins can delete
export const deleteVendorBillFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      billId: z.uuid("Invalid bill ID"),
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
      billId: z.uuid("Invalid bill ID"),
      projectId: z.uuid("Invalid project ID"),
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
      billId: z.uuid("Invalid bill ID"),
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
