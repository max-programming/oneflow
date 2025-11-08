import {
  boolean,
  date,
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { customers, projects } from "./projects";

// Enums for financial statuses
export type SalesOrderStatusEnum = "draft" | "confirmed" | "done" | "cancelled";
export type PurchaseOrderStatusEnum =
  | "draft"
  | "confirmed"
  | "done"
  | "cancelled";
export type InvoiceStatusEnum = "draft" | "sent" | "paid" | "cancelled";
export type PaymentStatusEnum = "unpaid" | "partially_paid" | "fully_paid";
export type ExpenseApprovalStatusEnum = "pending" | "approved" | "rejected";

export const salesOrderStatusEnum = pgEnum("sales_order_status", [
  "draft",
  "confirmed",
  "done",
  "cancelled",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "confirmed",
  "done",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "fully_paid",
]);

export const expenseApprovalStatusEnum = pgEnum("expense_approval_status", [
  "pending",
  "approved",
  "rejected",
]);

// Vendors Table
export const vendors = pgTable("vendors", {
  id: uuid().primaryKey().defaultRandom(),
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
  id: uuid().primaryKey().defaultRandom(),
  orderNumber: text().notNull().unique(), // Auto-generated: SO-001, SO-002, etc.
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
  status: salesOrderStatusEnum().notNull().default("draft"),
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

// Purchase Orders Table
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid().primaryKey().defaultRandom(),
  poNumber: text().notNull().unique(), // Auto-generated: PO-001, PO-002, etc.
  projectId: uuid().references(() => projects.id),
  vendorId: uuid()
    .notNull()
    .references(() => vendors.id),
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: purchaseOrderStatusEnum().notNull().default("draft"),
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
  id: uuid().primaryKey().defaultRandom(),
  invoiceNumber: text().notNull().unique(), // Auto-generated: INV-001, INV-002, etc.
  projectId: uuid().references(() => projects.id),
  customerId: uuid()
    .notNull()
    .references(() => customers.id),
  salesOrderId: uuid().references(() => salesOrders.id), // Optional link to SO
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  invoiceDate: date().notNull(),
  dueDate: date().notNull(),
  paymentStatus: paymentStatusEnum().notNull().default("unpaid"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"), // Track partial payments
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
  id: uuid().primaryKey().defaultRandom(),
  billNumber: text().notNull().unique(), // Auto-generated: BILL-001, BILL-002, etc.
  projectId: uuid().references(() => projects.id),
  vendorId: uuid()
    .notNull()
    .references(() => vendors.id),
  purchaseOrderId: uuid().references(() => purchaseOrders.id), // Optional link to PO
  description: text(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  billDate: date().notNull(),
  dueDate: date().notNull(),
  paymentStatus: paymentStatusEnum().notNull().default("unpaid"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
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
  id: uuid().primaryKey().defaultRandom(),
  expenseNumber: text().notNull().unique(), // Auto-generated: EXP-001, EXP-002, etc.
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
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});
