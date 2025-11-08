import { db } from "@/db";
import { projects, purchaseOrders, users, vendors } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  salesFinanceOrAdmin,
} from "./auth-middleware";

// Helper function to generate next PO number
async function generateNextPONumber(): Promise<string> {
  const lastPO = await db
    .select({ poNumber: purchaseOrders.poNumber })
    .from(purchaseOrders)
    .where(isNull(purchaseOrders.deletedAt))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(1);

  if (lastPO.length === 0) {
    return "PO-001";
  }

  const lastNumber = parseInt(lastPO[0].poNumber.split("-")[1]);
  const nextNumber = lastNumber + 1;
  return `PO-${nextNumber.toString().padStart(3, "0")}`;
}

// Helper function to calculate total amount
function calculateTotal(amount: string, taxPercentage: string): string {
  const baseAmount = parseFloat(amount);
  const tax = parseFloat(taxPercentage);
  const totalAmount = baseAmount + (baseAmount * tax) / 100;
  return totalAmount.toFixed(2);
}

// Create Purchase Order - Sales/Finance and Admins can create
export const createPurchaseOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid().optional().nullable(),
      vendorId: z.uuid("Vendor is required"),
      description: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      taxPercentage: z.string().default("0"),
      orderDate: z.string().min(1, "Order date is required"),
      status: z
        .enum(["draft", "confirmed", "done", "cancelled"])
        .default("draft"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Generate next PO number
    const poNumber = await generateNextPONumber();

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    const [purchaseOrder] = await db
      .insert(purchaseOrders)
      .values({
        poNumber,
        projectId: data.projectId,
        vendorId: data.vendorId,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        status: data.status,
        orderDate: data.orderDate,
        createdBy: userId,
      })
      .returning();

    if (!purchaseOrder) {
      throw new Error("Failed to create purchase order");
    }

    return purchaseOrder;
  });

// Get All Purchase Orders - All authenticated users can view (excluding deleted)
export const getPurchaseOrdersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.uuid().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const conditions = [isNull(purchaseOrders.deletedAt)];

    if (data?.projectId) {
      conditions.push(eq(purchaseOrders.projectId, data.projectId));
    }

    const allPurchaseOrders = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        projectId: purchaseOrders.projectId,
        projectName: projects.name,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
        description: purchaseOrders.description,
        amount: purchaseOrders.amount,
        taxPercentage: purchaseOrders.taxPercentage,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        createdBy: purchaseOrders.createdBy,
        createdByName: users.name,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));

    return allPurchaseOrders;
  });

// Get Purchase Order by ID - All authenticated users can view
export const getPurchaseOrderByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      purchaseOrderId: z.uuid("Invalid purchase order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [purchaseOrder] = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        projectId: purchaseOrders.projectId,
        projectName: projects.name,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
        vendorEmail: vendors.email,
        description: purchaseOrders.description,
        amount: purchaseOrders.amount,
        taxPercentage: purchaseOrders.taxPercentage,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        createdBy: purchaseOrders.createdBy,
        createdByName: users.name,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
      .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          isNull(purchaseOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!purchaseOrder) {
      throw new Error("Purchase order not found");
    }

    return purchaseOrder;
  });

// Update Purchase Order - Sales/Finance and Admins can update
export const updatePurchaseOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      purchaseOrderId: z.uuid("Invalid purchase order ID"),
      projectId: z.uuid().optional().nullable(),
      vendorId: z.uuid().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      taxPercentage: z.string().optional(),
      orderDate: z.string().optional(),
      status: z.enum(["draft", "confirmed", "done", "cancelled"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { purchaseOrderId, ...updateData } = data;

    // If amount or tax is being updated, recalculate total
    if (updateData.amount || updateData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: purchaseOrders.amount,
          taxPercentage: purchaseOrders.taxPercentage,
        })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId))
        .limit(1);

      if (!current) {
        throw new Error("Purchase order not found");
      }

      const finalAmount = updateData.amount || current.amount;
      const finalTax = updateData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);

      const [updatedPurchaseOrder] = await db
        .update(purchaseOrders)
        .set({ ...updateData, totalAmount })
        .where(eq(purchaseOrders.id, purchaseOrderId))
        .returning();

      if (!updatedPurchaseOrder) {
        throw new Error("Failed to update purchase order");
      }

      return updatedPurchaseOrder;
    }

    const [updatedPurchaseOrder] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, purchaseOrderId))
      .returning();

    if (!updatedPurchaseOrder) {
      throw new Error("Failed to update purchase order");
    }

    return updatedPurchaseOrder;
  });

// Delete Purchase Order (Soft Delete) - Sales/Finance and Admins can delete
export const deletePurchaseOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      purchaseOrderId: z.uuid("Invalid purchase order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedPurchaseOrder] = await db
      .update(purchaseOrders)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          isNull(purchaseOrders.deletedAt),
        ),
      )
      .returning();

    if (!deletedPurchaseOrder) {
      throw new Error("Purchase order not found");
    }

    return { success: true, message: "Purchase order deleted successfully" };
  });

// Link Purchase Order to Project
export const linkPurchaseOrderToProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      purchaseOrderId: z.uuid("Invalid purchase order ID"),
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedPurchaseOrder] = await db
      .update(purchaseOrders)
      .set({ projectId: data.projectId })
      .where(eq(purchaseOrders.id, data.purchaseOrderId))
      .returning();

    if (!updatedPurchaseOrder) {
      throw new Error("Failed to link purchase order to project");
    }

    return updatedPurchaseOrder;
  });

// Unlink Purchase Order from Project
export const unlinkPurchaseOrderFromProjectFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      purchaseOrderId: z.uuid("Invalid purchase order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedPurchaseOrder] = await db
      .update(purchaseOrders)
      .set({ projectId: null })
      .where(eq(purchaseOrders.id, data.purchaseOrderId))
      .returning();

    if (!updatedPurchaseOrder) {
      throw new Error("Failed to unlink purchase order from project");
    }

    return updatedPurchaseOrder;
  });
