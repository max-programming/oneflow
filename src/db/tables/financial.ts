import {
  boolean,
  date,
  decimal,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { customers, projects } from "./projects";

// Enums for financial statuses
export type InvoiceStatusEnum = "draft" | "sent" | "paid" | "cancelled";
export type ExpenseApprovalStatusEnum = "pending" | "approved" | "rejected";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "cancelled",
]);

export const expenseApprovalStatusEnum = pgEnum("expense_approval_status", [
  "pending",
  "approved",
  "rejected",
]);

// Vendors Table
export const vendors = pgTable("vendors", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  phone: text().notNull(),
  address: text(),
  paymentTerms: text(), // e.g., "Net 30", "Net 60"
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

// Sales Orders Table
export const salesOrders = pgTable("sales_orders", {
  id: serial().primaryKey(),
  orderNumber: text().notNull().unique(), // Auto-generated: SO-{id}
  projectId: uuid().references(() => projects.id),
  customerId: uuid()
    .notNull()
    .references(() => customers.id),
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Base amount before tax
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"), // Tax percentage (e.g., 18.00 for 18%)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // amount + tax
  orderDate: date().notNull(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

// Purchase Order (PO) = what we asked the vendor to do/supply (a purchase commitment / promise, created by the buyer).

// Vendor Bill = what the vendor actually billed us (a supplier invoice, used for accounting and payment).

// PO = request/authorization.
// Vendor Bill = financial/legal document to pay.

// Purchase Orders Table
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial().primaryKey(),
  poNumber: text().notNull().unique(), // Auto-generated: PO-{id}
  projectId: uuid().references(() => projects.id),
  vendorId: serial()
    .notNull()
    .references(() => vendors.id),
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  orderDate: date().notNull(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

// Customer Invoices Table
export const customerInvoices = pgTable("customer_invoices", {
  id: serial().primaryKey(),
  invoiceNumber: text().notNull().unique(), // Auto-generated: INV-{id}
  projectId: uuid().references(() => projects.id),
  customerId: uuid()
    .notNull()
    .references(() => customers.id),
  salesOrderId: serial().references(() => salesOrders.id), // Optional link to SO
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  invoiceDate: date().notNull(),
  dueDate: date().notNull(),
  status: invoiceStatusEnum().notNull().default("draft"),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

// Vendor Bills Table
export const vendorBills = pgTable("vendor_bills", {
  id: serial().primaryKey(),
  billNumber: text().notNull().unique(), // Auto-generated: BILL-{id}
  projectId: uuid().references(() => projects.id),
  vendorId: serial()
    .notNull()
    .references(() => vendors.id),
  purchaseOrderId: serial().references(() => purchaseOrders.id), // Optional link to PO
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  billDate: date().notNull(),
  dueDate: date().notNull(),
  status: invoiceStatusEnum().notNull().default("draft"),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

// Expenses Table
export const expenses = pgTable("expenses", {
  id: serial().primaryKey(),
  expenseNumber: text().notNull().unique(), // Auto-generated: EXP-{id}
  projectId: uuid().references(() => projects.id),
  userId: uuid()
    .notNull()
    .references(() => users.id), // Who submitted the expense
  description: text().notNull(),
  category: text(), // Optional: travel, tools, meals, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date().notNull(),
  billable: boolean().notNull().default(false), // Can be charged to customer
  approvalStatus: expenseApprovalStatusEnum().notNull().default("pending"),
  approvedBy: uuid().references(() => users.id), // Project Manager who approved
  approvedAt: timestamp(),
  notes: text(), // Approval notes or rejection reason
  invoiceId: serial().references(() => customerInvoices.id), // Auto-created invoice for billable expenses
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});
