import { db } from "@/db";
import {
  customerInvoices,
  customers,
  projects,
  salesOrders,
  users,
} from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, isNull, sql, gte, lte, or } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware, salesFinanceOrAdmin } from "./auth-middleware";

// Get Sales & Finance Dashboard Statistics
export const getSalesFinanceDashboardFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .handler(async () => {
    // Get invoice statistics
    const invoiceStats = await db
      .select({
        totalInvoices: count(),
        totalAmount: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
        paidAmount: sql<string>`COALESCE(SUM(${customerInvoices.paidAmount}), 0)`,
      })
      .from(customerInvoices)
      .where(isNull(customerInvoices.deletedAt));

    // Get invoice count by payment status
    const unpaidInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.paymentStatus, "unpaid"),
        ),
      );

    const partiallyPaidInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.paymentStatus, "partially_paid"),
        ),
      );

    const fullyPaidInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.paymentStatus, "fully_paid"),
        ),
      );

    // Get overdue invoices
    const today = new Date().toISOString().split("T")[0];
    const overdueInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          or(
            eq(customerInvoices.paymentStatus, "unpaid"),
            eq(customerInvoices.paymentStatus, "partially_paid"),
          ),
          sql`${customerInvoices.dueDate} < ${today}`,
        ),
      );

    // Get sales order statistics
    const salesOrderStats = await db
      .select({
        totalOrders: count(),
        totalAmount: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)`,
      })
      .from(salesOrders)
      .where(isNull(salesOrders.deletedAt));

    // Get sales orders by status
    const draftOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(
        and(isNull(salesOrders.deletedAt), eq(salesOrders.status, "draft")),
      );

    const confirmedOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(
        and(isNull(salesOrders.deletedAt), eq(salesOrders.status, "confirmed")),
      );

    const doneOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(
        and(isNull(salesOrders.deletedAt), eq(salesOrders.status, "done")),
      );

    // Get customer count
    const customerCount = await db
      .select({ count: count() })
      .from(customers)
      .where(isNull(customers.deletedAt));

    // Get recent activities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          gte(customerInvoices.createdAt, sevenDaysAgo),
        ),
      );

    const recentSalesOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(
        and(
          isNull(salesOrders.deletedAt),
          gte(salesOrders.createdAt, sevenDaysAgo),
        ),
      );

    return {
      invoices: {
        total: invoiceStats[0]?.totalInvoices || 0,
        totalAmount: invoiceStats[0]?.totalAmount || "0",
        paidAmount: invoiceStats[0]?.paidAmount || "0",
        unpaid: unpaidInvoices[0]?.count || 0,
        partiallyPaid: partiallyPaidInvoices[0]?.count || 0,
        fullyPaid: fullyPaidInvoices[0]?.count || 0,
        overdue: overdueInvoices[0]?.count || 0,
      },
      salesOrders: {
        total: salesOrderStats[0]?.totalOrders || 0,
        totalAmount: salesOrderStats[0]?.totalAmount || "0",
        draft: draftOrders[0]?.count || 0,
        confirmed: confirmedOrders[0]?.count || 0,
        done: doneOrders[0]?.count || 0,
      },
      customers: {
        total: customerCount[0]?.count || 0,
      },
      recentActivity: {
        invoicesLast7Days: recentInvoices[0]?.count || 0,
        salesOrdersLast7Days: recentSalesOrders[0]?.count || 0,
      },
    };
  });

// Get monthly revenue trend (last 6 months)
export const getMonthlyRevenueTrendFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .handler(async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${customerInvoices.invoiceDate}, 'YYYY-MM')`,
        totalRevenue: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
        paidRevenue: sql<string>`COALESCE(SUM(${customerInvoices.paidAmount}), 0)`,
        invoiceCount: count(),
      })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          gte(
            customerInvoices.invoiceDate,
            sixMonthsAgo.toISOString().split("T")[0],
          ),
        ),
      )
      .groupBy(sql`TO_CHAR(${customerInvoices.invoiceDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${customerInvoices.invoiceDate}, 'YYYY-MM')`);

    return monthlyData;
  });

// Get top customers by revenue
export const getTopCustomersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z
      .object({
        limit: z.number().int().positive().default(10),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const limit = data?.limit || 10;

    const topCustomers = await db
      .select({
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email,
        totalRevenue: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
        paidAmount: sql<string>`COALESCE(SUM(${customerInvoices.paidAmount}), 0)`,
        invoiceCount: count(customerInvoices.id),
      })
      .from(customers)
      .leftJoin(
        customerInvoices,
        and(
          eq(customers.id, customerInvoices.customerId),
          isNull(customerInvoices.deletedAt),
        ),
      )
      .where(isNull(customers.deletedAt))
      .groupBy(customers.id, customers.name, customers.email)
      .orderBy(desc(sql`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`))
      .limit(limit);

    return topCustomers;
  });

// Get payment status distribution for chart
export const getPaymentStatusDistributionFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .handler(async () => {
    const distribution = await db
      .select({
        status: customerInvoices.paymentStatus,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
      })
      .from(customerInvoices)
      .where(isNull(customerInvoices.deletedAt))
      .groupBy(customerInvoices.paymentStatus);

    return distribution;
  });
