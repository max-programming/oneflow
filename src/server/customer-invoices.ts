import { db } from "@/db";
import {
  customerInvoices,
  customers,
  projects,
  salesOrders,
  users,
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

// Create Customer Invoice - Sales/Finance and Admins can create
export const createCustomerInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.number().optional().nullable(),
      customerId: z.number("Customer is required"),
      salesOrderId: z.number().int().positive().optional().nullable(),
      description: z.string().optional(),
      amount: z.string().min(1, "Amount is required"),
      taxPercentage: z.string().default("0"),
      invoiceDate: z.string().min(1, "Invoice date is required"),
      dueDate: z.string().min(1, "Due date is required"),
      status: z.enum(["draft", "sent", "paid", "cancelled"]).default("draft"),
    }),
  )
  .handler(async ({ data, context }) => {
    const userId = context.user.id;

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    // Insert first with a temporary invoice number
    const [invoice] = await db
      .insert(customerInvoices)
      .values({
        invoiceNumber: "TEMP", // Temporary, will be updated
        projectId: data.projectId,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId ?? undefined,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        status: data.status,
        createdBy: userId,
      })
      .returning();

    if (!invoice) {
      throw new Error("Failed to create customer invoice");
    }

    // Update with actual invoice number based on ID
    const invoiceNumber = `INV-${invoice.id.toString().padStart(3, "0")}`;
    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set({ invoiceNumber })
      .where(eq(customerInvoices.id, invoice.id))
      .returning();

    return updatedInvoice;
  });

// Get All Customer Invoices - All authenticated users can view (excluding deleted)
export const getCustomerInvoicesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.number().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const conditions = [isNull(customerInvoices.deletedAt)];

    if (data?.projectId) {
      conditions.push(eq(customerInvoices.projectId, data.projectId));
    }

    const allInvoices = await db
      .select({
        id: customerInvoices.id,
        invoiceNumber: customerInvoices.invoiceNumber,
        projectId: customerInvoices.projectId,
        projectName: projects.name,
        customerId: customerInvoices.customerId,
        customerName: customers.name,
        salesOrderId: customerInvoices.salesOrderId,
        salesOrderNumber: salesOrders.orderNumber,
        description: customerInvoices.description,
        amount: customerInvoices.amount,
        taxPercentage: customerInvoices.taxPercentage,
        totalAmount: customerInvoices.totalAmount,
        invoiceDate: customerInvoices.invoiceDate,
        dueDate: customerInvoices.dueDate,
        status: customerInvoices.status,
        createdBy: customerInvoices.createdBy,
        createdByName: users.name,
        createdAt: customerInvoices.createdAt,
        updatedAt: customerInvoices.updatedAt,
      })
      .from(customerInvoices)
      .leftJoin(customers, eq(customerInvoices.customerId, customers.id))
      .leftJoin(projects, eq(customerInvoices.projectId, projects.id))
      .leftJoin(salesOrders, eq(customerInvoices.salesOrderId, salesOrders.id))
      .leftJoin(users, eq(customerInvoices.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(customerInvoices.createdAt));

    return allInvoices;
  });

// Get Customer Invoice by ID - All authenticated users can view
export const getCustomerInvoiceByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [invoice] = await db
      .select({
        id: customerInvoices.id,
        invoiceNumber: customerInvoices.invoiceNumber,
        projectId: customerInvoices.projectId,
        projectName: projects.name,
        customerId: customerInvoices.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        salesOrderId: customerInvoices.salesOrderId,
        salesOrderNumber: salesOrders.orderNumber,
        description: customerInvoices.description,
        amount: customerInvoices.amount,
        taxPercentage: customerInvoices.taxPercentage,
        totalAmount: customerInvoices.totalAmount,
        invoiceDate: customerInvoices.invoiceDate,
        dueDate: customerInvoices.dueDate,
        status: customerInvoices.status,
        createdBy: customerInvoices.createdBy,
        createdByName: users.name,
        createdAt: customerInvoices.createdAt,
        updatedAt: customerInvoices.updatedAt,
      })
      .from(customerInvoices)
      .leftJoin(customers, eq(customerInvoices.customerId, customers.id))
      .leftJoin(projects, eq(customerInvoices.projectId, projects.id))
      .leftJoin(salesOrders, eq(customerInvoices.salesOrderId, salesOrders.id))
      .leftJoin(users, eq(customerInvoices.createdBy, users.id))
      .where(
        and(
          eq(customerInvoices.id, data.invoiceId),
          isNull(customerInvoices.deletedAt),
        ),
      )
      .limit(1);

    if (!invoice) {
      throw new Error("Customer invoice not found");
    }

    return invoice;
  });

// Update Customer Invoice - Sales/Finance and Admins can update
export const updateCustomerInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
      projectId: z.number().optional().nullable(),
      customerId: z.number().optional(),
      salesOrderId: z.number().int().positive().optional().nullable(),
      description: z.string().optional(),
      amount: z.string().optional(),
      taxPercentage: z.string().optional(),
      invoiceDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { invoiceId, ...updateData } = data;

    // Clean update data: convert null to undefined for optional foreign keys
    const cleanedData: any = { ...updateData };
    if (cleanedData.salesOrderId === null) {
      cleanedData.salesOrderId = undefined;
    }

    // Validate status transitions if status is being updated
    if (cleanedData.status) {
      const [current] = await db
        .select({
          status: customerInvoices.status,
        })
        .from(customerInvoices)
        .where(eq(customerInvoices.id, invoiceId))
        .limit(1);

      if (!current) {
        throw new Error("Customer invoice not found");
      }

      // Validate the status transition
      validateStatusTransition(current.status, cleanedData.status);
    }

    // Prevent editing paid or cancelled invoices (except status field)
    if (Object.keys(cleanedData).length > 0 && !cleanedData.status) {
      const [current] = await db
        .select({ status: customerInvoices.status })
        .from(customerInvoices)
        .where(eq(customerInvoices.id, invoiceId))
        .limit(1);

      if (current && !canEditDocument(current.status)) {
        throw new Error(`Cannot edit ${current.status} invoice`);
      }
    }

    // If amount or tax is being updated, recalculate total
    if (cleanedData.amount || cleanedData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: customerInvoices.amount,
          taxPercentage: customerInvoices.taxPercentage,
        })
        .from(customerInvoices)
        .where(eq(customerInvoices.id, invoiceId))
        .limit(1);

      if (!current) {
        throw new Error("Customer invoice not found");
      }

      const finalAmount = cleanedData.amount || current.amount;
      const finalTax = cleanedData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);

      const [updatedInvoice] = await db
        .update(customerInvoices)
        .set({ ...cleanedData, totalAmount })
        .where(eq(customerInvoices.id, invoiceId))
        .returning();

      if (!updatedInvoice) {
        throw new Error("Failed to update customer invoice");
      }

      return updatedInvoice;
    }

    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set(cleanedData)
      .where(eq(customerInvoices.id, invoiceId))
      .returning();

    if (!updatedInvoice) {
      throw new Error("Failed to update customer invoice");
    }

    return updatedInvoice;
  });

// Delete Customer Invoice (Soft Delete) - Sales/Finance and Admins can delete
export const deleteCustomerInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedInvoice] = await db
      .update(customerInvoices)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(customerInvoices.id, data.invoiceId),
          isNull(customerInvoices.deletedAt),
        ),
      )
      .returning();

    if (!deletedInvoice) {
      throw new Error("Customer invoice not found");
    }

    return { success: true, message: "Customer invoice deleted successfully" };
  });

// Link Customer Invoice to Project
export const linkCustomerInvoiceToProjectFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
      projectId: z.number("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set({ projectId: data.projectId })
      .where(eq(customerInvoices.id, data.invoiceId))
      .returning();

    if (!updatedInvoice) {
      throw new Error("Failed to link customer invoice to project");
    }

    return updatedInvoice;
  });

// Unlink Customer Invoice from Project
export const unlinkCustomerInvoiceFromProjectFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.number().int().positive("Invalid invoice ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set({ projectId: null })
      .where(eq(customerInvoices.id, data.invoiceId))
      .returning();

    if (!updatedInvoice) {
      throw new Error("Failed to unlink customer invoice from project");
    }

    return updatedInvoice;
  });

// Get Project Customer Invoices - Get customer invoices for a specific project (for financial links)
export const getProjectCustomerInvoicesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.number("Invalid project ID"),
      limit: z.number().optional().default(5),
    }),
  )
  .handler(async ({ data }) => {
    const projectInvoices = await db
      .select({
        id: customerInvoices.id,
        invoiceNumber: customerInvoices.invoiceNumber,
        customerId: customerInvoices.customerId,
        customerName: customers.name,
        description: customerInvoices.description,
        amount: customerInvoices.amount,
        taxPercentage: customerInvoices.taxPercentage,
        totalAmount: customerInvoices.totalAmount,
        invoiceDate: customerInvoices.invoiceDate,
        dueDate: customerInvoices.dueDate,
        status: customerInvoices.status,
        createdAt: customerInvoices.createdAt,
      })
      .from(customerInvoices)
      .leftJoin(customers, eq(customerInvoices.customerId, customers.id))
      .where(
        and(
          eq(customerInvoices.projectId, data.projectId),
          isNull(customerInvoices.deletedAt),
        ),
      )
      .orderBy(desc(customerInvoices.createdAt))
      .limit(data.limit);

    return projectInvoices;
  });
