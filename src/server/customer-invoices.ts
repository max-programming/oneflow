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

// Helper function to generate next Invoice number
async function generateNextInvoiceNumber(): Promise<string> {
  const lastInvoice = await db
    .select({ invoiceNumber: customerInvoices.invoiceNumber })
    .from(customerInvoices)
    .where(isNull(customerInvoices.deletedAt))
    .orderBy(desc(customerInvoices.createdAt))
    .limit(1);

  if (lastInvoice.length === 0) {
    return "INV-001";
  }

  const lastNumber = parseInt(lastInvoice[0].invoiceNumber.split("-")[1]);
  const nextNumber = lastNumber + 1;
  return `INV-${nextNumber.toString().padStart(3, "0")}`;
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

// Create Customer Invoice - Sales/Finance and Admins can create
export const createCustomerInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      projectId: z.uuid().optional().nullable(),
      customerId: z.uuid("Customer is required"),
      salesOrderId: z.uuid().optional().nullable(),
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

    // Generate next Invoice number
    const invoiceNumber = await generateNextInvoiceNumber();

    // Calculate total amount
    const totalAmount = calculateTotal(data.amount, data.taxPercentage);

    const [invoice] = await db
      .insert(customerInvoices)
      .values({
        invoiceNumber,
        projectId: data.projectId,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId,
        description: data.description,
        amount: data.amount,
        taxPercentage: data.taxPercentage,
        totalAmount,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        paymentStatus: "unpaid",
        paidAmount: "0",
        status: data.status,
        createdBy: userId,
      })
      .returning();

    if (!invoice) {
      throw new Error("Failed to create customer invoice");
    }

    return invoice;
  });

// Get All Customer Invoices - All authenticated users can view (excluding deleted)
export const getCustomerInvoicesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z
      .object({
        projectId: z.uuid().optional(),
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
        paymentStatus: customerInvoices.paymentStatus,
        paidAmount: customerInvoices.paidAmount,
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
      invoiceId: z.uuid("Invalid invoice ID"),
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
        paymentStatus: customerInvoices.paymentStatus,
        paidAmount: customerInvoices.paidAmount,
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
      invoiceId: z.uuid("Invalid invoice ID"),
      projectId: z.uuid().optional().nullable(),
      customerId: z.uuid().optional(),
      salesOrderId: z.uuid().optional().nullable(),
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

    // If amount or tax is being updated, recalculate total
    if (updateData.amount || updateData.taxPercentage) {
      // Fetch current values if not all provided
      const [current] = await db
        .select({
          amount: customerInvoices.amount,
          taxPercentage: customerInvoices.taxPercentage,
          paidAmount: customerInvoices.paidAmount,
        })
        .from(customerInvoices)
        .where(eq(customerInvoices.id, invoiceId))
        .limit(1);

      if (!current) {
        throw new Error("Customer invoice not found");
      }

      const finalAmount = updateData.amount || current.amount;
      const finalTax = updateData.taxPercentage || current.taxPercentage;

      const totalAmount = calculateTotal(finalAmount, finalTax);
      const paymentStatus = determinePaymentStatus(
        totalAmount,
        current.paidAmount,
      );

      const [updatedInvoice] = await db
        .update(customerInvoices)
        .set({ ...updateData, totalAmount, paymentStatus })
        .where(eq(customerInvoices.id, invoiceId))
        .returning();

      if (!updatedInvoice) {
        throw new Error("Failed to update customer invoice");
      }

      return updatedInvoice;
    }

    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set(updateData)
      .where(eq(customerInvoices.id, invoiceId))
      .returning();

    if (!updatedInvoice) {
      throw new Error("Failed to update customer invoice");
    }

    return updatedInvoice;
  });

// Record Payment for Customer Invoice
export const recordPaymentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.uuid("Invalid invoice ID"),
      paymentAmount: z.string().min(1, "Payment amount is required"),
    }),
  )
  .handler(async ({ data }) => {
    // Fetch current invoice
    const [current] = await db
      .select({
        totalAmount: customerInvoices.totalAmount,
        paidAmount: customerInvoices.paidAmount,
      })
      .from(customerInvoices)
      .where(eq(customerInvoices.id, data.invoiceId))
      .limit(1);

    if (!current) {
      throw new Error("Customer invoice not found");
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

    const [updatedInvoice] = await db
      .update(customerInvoices)
      .set({
        paidAmount: newPaidAmount,
        paymentStatus,
        ...(status && { status }),
      })
      .where(eq(customerInvoices.id, data.invoiceId))
      .returning();

    if (!updatedInvoice) {
      throw new Error("Failed to record payment");
    }

    return updatedInvoice;
  });

// Delete Customer Invoice (Soft Delete) - Sales/Finance and Admins can delete
export const deleteCustomerInvoiceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      invoiceId: z.uuid("Invalid invoice ID"),
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
      invoiceId: z.uuid("Invalid invoice ID"),
      projectId: z.uuid("Invalid project ID"),
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
      invoiceId: z.uuid("Invalid invoice ID"),
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
