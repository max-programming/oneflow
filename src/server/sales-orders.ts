import { db } from "@/db";
import { customers, projects, salesOrders, users } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  salesFinanceOrAdmin,
} from "./auth-middleware";

// Helper function to calculate total amount
function calculateTotal(amount: string, taxPercentage: string): string {
  const baseAmount = parseFloat(amount);
  const tax = parseFloat(taxPercentage);
  const totalAmount = baseAmount + (baseAmount * tax) / 100;
  return totalAmount.toFixed(2);
}

// Create Sales Order - Sales/Finance and Admins can create
export const createSalesOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.number().optional().nullable(),
      customerId: z.number("Customer is required"),
      description: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      taxPercentage: z.string().default("0"),
      orderDate: z.string().min(1, "Order date is required"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    // Insert first with a temporary order number
    const [salesOrder] = await db
      .insert(salesOrders)
      .values({
        orderNumber: "TEMP", // Temporary, will be updated
        projectId: data.projectId,
        customerId: data.customerId,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        orderDate: data.orderDate,
        createdBy: userId,
      })
      .returning();

    if (!salesOrder) {
      throw new Error("Failed to create sales order");
    }

    // Update with actual order number based on ID
    const orderNumber = `SO-${salesOrder.id.toString().padStart(3, "0")}`;
    const [updatedSalesOrder] = await db
      .update(salesOrders)
      .set({ orderNumber })
      .where(eq(salesOrders.id, salesOrder.id))
      .returning();

    return updatedSalesOrder;
  });

// Get All Sales Orders - All authenticated users can view (excluding deleted)
export const getSalesOrdersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const conditions = [isNull(salesOrders.deletedAt)];

    if (data?.projectId) {
      conditions.push(eq(salesOrders.projectId, data.projectId));
    }

    const allSalesOrders = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        projectId: salesOrders.projectId,
        projectName: projects.name,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        description: salesOrders.description,
        amount: salesOrders.amount,
        taxPercentage: salesOrders.taxPercentage,
        totalAmount: salesOrders.totalAmount,
        orderDate: salesOrders.orderDate,
        createdBy: salesOrders.createdBy,
        createdByName: users.name,
        createdAt: salesOrders.createdAt,
        updatedAt: salesOrders.updatedAt,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .leftJoin(projects, eq(salesOrders.projectId, projects.id))
      .leftJoin(users, eq(salesOrders.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(salesOrders.createdAt));

    return allSalesOrders;
  });

// Get Sales Order by ID - All authenticated users can view
export const getSalesOrderByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      salesOrderId: z.number().int().positive("Invalid sales order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [salesOrder] = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        projectId: salesOrders.projectId,
        projectName: projects.name,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        description: salesOrders.description,
        amount: salesOrders.amount,
        taxPercentage: salesOrders.taxPercentage,
        totalAmount: salesOrders.totalAmount,
        orderDate: salesOrders.orderDate,
        createdBy: salesOrders.createdBy,
        createdByName: users.name,
        createdAt: salesOrders.createdAt,
        updatedAt: salesOrders.updatedAt,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .leftJoin(projects, eq(salesOrders.projectId, projects.id))
      .leftJoin(users, eq(salesOrders.createdBy, users.id))
      .where(
        and(
          eq(salesOrders.id, data.salesOrderId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .limit(1);

    if (!salesOrder) {
      throw new Error("Sales order not found");
    }

    return salesOrder;
  });

// Update Sales Order - Sales/Finance and Admins can update
export const updateSalesOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      salesOrderId: z.number().int().positive("Invalid sales order ID"),
      projectId: z.number().optional().nullable(),
      customerId: z.number().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      taxPercentage: z.string().optional(),
      orderDate: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { salesOrderId, ...updateData } = data;

    // If amount or tax is being updated, recalculate total
    if (updateData.amount || updateData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: salesOrders.amount,
          taxPercentage: salesOrders.taxPercentage,
        })
        .from(salesOrders)
        .where(eq(salesOrders.id, salesOrderId))
        .limit(1);

      if (!current) {
        throw new Error("Sales order not found");
      }

      const finalAmount = updateData.amount || current.amount;
      const finalTax = updateData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);

      const [updatedSalesOrder] = await db
        .update(salesOrders)
        .set({ ...updateData, totalAmount })
        .where(eq(salesOrders.id, salesOrderId))
        .returning();

      if (!updatedSalesOrder) {
        throw new Error("Failed to update sales order");
      }

      return updatedSalesOrder;
    }

    const [updatedSalesOrder] = await db
      .update(salesOrders)
      .set(updateData)
      .where(eq(salesOrders.id, salesOrderId))
      .returning();

    if (!updatedSalesOrder) {
      throw new Error("Failed to update sales order");
    }

    return updatedSalesOrder;
  });

// Delete Sales Order (Soft Delete) - Sales/Finance and Admins can delete
export const deleteSalesOrderFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      salesOrderId: z.number().int().positive("Invalid sales order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedSalesOrder] = await db
      .update(salesOrders)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(salesOrders.id, data.salesOrderId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .returning();

    if (!deletedSalesOrder) {
      throw new Error("Sales order not found");
    }

    return { success: true, message: "Sales order deleted successfully" };
  });

// Link Sales Order to Project
export const linkSalesOrderToProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      salesOrderId: z.number().int().positive("Invalid sales order ID"),
      projectId: z.number("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedSalesOrder] = await db
      .update(salesOrders)
      .set({ projectId: data.projectId })
      .where(eq(salesOrders.id, data.salesOrderId))
      .returning();

    if (!updatedSalesOrder) {
      throw new Error("Failed to link sales order to project");
    }

    return updatedSalesOrder;
  });

// Unlink Sales Order from Project
export const unlinkSalesOrderFromProjectFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      salesOrderId: z.number().int().positive("Invalid sales order ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedSalesOrder] = await db
      .update(salesOrders)
      .set({ projectId: null })
      .where(eq(salesOrders.id, data.salesOrderId))
      .returning();

    if (!updatedSalesOrder) {
      throw new Error("Failed to unlink sales order from project");
    }

    return updatedSalesOrder;
  });

// Get Project Sales Orders - Get sales orders for a specific project (for financial links)
export const getProjectSalesOrdersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
      limit: z.number().optional().default(5),
    }),
  )
  .handler(async ({ data }) => {
    const projectSalesOrders = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        description: salesOrders.description,
        amount: salesOrders.amount,
        taxPercentage: salesOrders.taxPercentage,
        totalAmount: salesOrders.totalAmount,
        orderDate: salesOrders.orderDate,
        createdAt: salesOrders.createdAt,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(
        and(
          eq(salesOrders.projectId, data.projectId),
          isNull(salesOrders.deletedAt),
        ),
      )
      .orderBy(desc(salesOrders.createdAt))
      .limit(data.limit);

    return projectSalesOrders;
  });
