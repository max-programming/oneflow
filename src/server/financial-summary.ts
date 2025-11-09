import { db } from "@/db";
import {
  customerInvoices,
  expenses,
  purchaseOrders,
  salesOrders,
  vendorBills,
} from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { allRoles, authMiddleware } from "./auth-middleware";

// Get Project Financial Summary - Revenue, Cost, Profit
export const getProjectFinancialSummaryFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    // Calculate total revenue from customer invoices
    const revenueResult = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
        paidRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${customerInvoices.status} = 'paid' THEN ${customerInvoices.totalAmount} ELSE 0 END), 0)`,
        count: count(),
      })
      .from(customerInvoices)
      .where(
        and(
          eq(customerInvoices.projectId, data.projectId),
          isNull(customerInvoices.deletedAt),
        ),
      );

    const revenue = {
      total: parseFloat(revenueResult[0]?.totalRevenue || "0"),
      paid: parseFloat(revenueResult[0]?.paidRevenue || "0"),
      count: revenueResult[0]?.count || 0,
    };

    // Calculate total cost from vendor bills
    const vendorBillsCostResult = await db
      .select({
        totalCost: sql<string>`COALESCE(SUM(${vendorBills.totalAmount}), 0)`,
        paidCost: sql<string>`COALESCE(SUM(CASE WHEN ${vendorBills.status} = 'paid' THEN ${vendorBills.totalAmount} ELSE 0 END), 0)`,
        count: count(),
      })
      .from(vendorBills)
      .where(
        and(
          eq(vendorBills.projectId, data.projectId),
          isNull(vendorBills.deletedAt),
        ),
      );

    const vendorBillsCost = {
      total: parseFloat(vendorBillsCostResult[0]?.totalCost || "0"),
      paid: parseFloat(vendorBillsCostResult[0]?.paidCost || "0"),
      count: vendorBillsCostResult[0]?.count || 0,
    };

    // Calculate total cost from approved expenses
    const expensesCostResult = await db
      .select({
        totalCost: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
        count: count(),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.projectId, data.projectId),
          eq(expenses.approvalStatus, "approved"),
          isNull(expenses.deletedAt),
        ),
      );

    const expensesCost = {
      total: parseFloat(expensesCostResult[0]?.totalCost || "0"),
      count: expensesCostResult[0]?.count || 0,
    };

    // Total cost = vendor bills + approved expenses
    const totalCost = vendorBillsCost.total + expensesCost.total;

    // Calculate profit
    const profit = revenue.total - totalCost;
    const profitMargin =
      revenue.total > 0 ? ((profit / revenue.total) * 100).toFixed(2) : "0";

    return {
      revenue: {
        total: revenue.total.toFixed(2),
        paid: revenue.paid.toFixed(2),
        unpaid: (revenue.total - revenue.paid).toFixed(2),
        invoiceCount: revenue.count,
      },
      costs: {
        total: totalCost.toFixed(2),
        vendorBills: vendorBillsCost.total.toFixed(2),
        expenses: expensesCost.total.toFixed(2),
        vendorBillCount: vendorBillsCost.count,
        expenseCount: expensesCost.count,
      },
      profit: {
        amount: profit.toFixed(2),
        margin: profitMargin,
      },
    };
  });

// Get Project Financial Counts - For Links Panel
export const getProjectFinancialCountsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      projectId: z.uuid("Invalid project ID"),
    }),
  )
  .handler(async ({ data }) => {
    // Get Sales Orders count and total
    const [salesOrdersData] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)`,
      })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.projectId, data.projectId),
          isNull(salesOrders.deletedAt),
        ),
      );

    // Get Purchase Orders count and total
    const [purchaseOrdersData] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.projectId, data.projectId),
          isNull(purchaseOrders.deletedAt),
        ),
      );

    // Get Customer Invoices count and total
    const [customerInvoicesData] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
      })
      .from(customerInvoices)
      .where(
        and(
          eq(customerInvoices.projectId, data.projectId),
          isNull(customerInvoices.deletedAt),
        ),
      );

    // Get Vendor Bills count and total
    const [vendorBillsData] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${vendorBills.totalAmount}), 0)`,
      })
      .from(vendorBills)
      .where(
        and(
          eq(vendorBills.projectId, data.projectId),
          isNull(vendorBills.deletedAt),
        ),
      );

    // Get Expenses count and total (approved only)
    const [expensesData] = await db
      .select({
        count: count(),
        total: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.projectId, data.projectId),
          eq(expenses.approvalStatus, "approved"),
          isNull(expenses.deletedAt),
        ),
      );

    return {
      salesOrders: {
        count: salesOrdersData?.count || 0,
        total: parseFloat(salesOrdersData?.total || "0").toFixed(2),
      },
      purchaseOrders: {
        count: purchaseOrdersData?.count || 0,
        total: parseFloat(purchaseOrdersData?.total || "0").toFixed(2),
      },
      customerInvoices: {
        count: customerInvoicesData?.count || 0,
        total: parseFloat(customerInvoicesData?.total || "0").toFixed(2),
      },
      vendorBills: {
        count: vendorBillsData?.count || 0,
        total: parseFloat(vendorBillsData?.total || "0").toFixed(2),
      },
      expenses: {
        count: expensesData?.count || 0,
        total: parseFloat(expensesData?.total || "0").toFixed(2),
      },
    };
  });

// Get All Projects Financial Summary - For Dashboard
export const getAllProjectsFinancialSummaryFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    // Get total revenue from all customer invoices
    const [totalRevenueData] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
        paid: sql<string>`COALESCE(SUM(CASE WHEN ${customerInvoices.status} = 'paid' THEN ${customerInvoices.totalAmount} ELSE 0 END), 0)`,
      })
      .from(customerInvoices)
      .where(isNull(customerInvoices.deletedAt));

    // Get total costs from vendor bills
    const [vendorBillsCostData] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${vendorBills.totalAmount}), 0)`,
      })
      .from(vendorBills)
      .where(isNull(vendorBills.deletedAt));

    // Get total costs from approved expenses
    const [expensesCostData] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.approvalStatus, "approved"),
          isNull(expenses.deletedAt),
        ),
      );

    const totalRevenue = parseFloat(totalRevenueData?.total || "0");
    const paidRevenue = parseFloat(totalRevenueData?.paid || "0");
    const totalCost =
      parseFloat(vendorBillsCostData?.total || "0") +
      parseFloat(expensesCostData?.total || "0");
    const totalProfit = totalRevenue - totalCost;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      paidRevenue: paidRevenue.toFixed(2),
      unpaidRevenue: (totalRevenue - paidRevenue).toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      profitMargin:
        totalRevenue > 0
          ? ((totalProfit / totalRevenue) * 100).toFixed(2)
          : "0",
    };
  });
