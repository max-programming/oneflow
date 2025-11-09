import { db } from "@/db";
import { customerInvoices, customers, salesOrders } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, isNull, sql, gte, or } from "drizzle-orm";
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
        paidAmount: sql<string>`COALESCE(SUM(CASE WHEN ${customerInvoices.status} = 'paid' THEN ${customerInvoices.totalAmount} ELSE 0 END), 0)`,
      })
      .from(customerInvoices)
      .where(isNull(customerInvoices.deletedAt));

    // Get invoice count by status
    const draftInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.status, "draft"),
        ),
      );

    const sentInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.status, "sent"),
        ),
      );

    const paidInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          eq(customerInvoices.status, "paid"),
        ),
      );

    // Get overdue invoices (not paid and past due date)
    const today = new Date().toISOString().split("T")[0];
    const overdueInvoices = await db
      .select({ count: count() })
      .from(customerInvoices)
      .where(
        and(
          isNull(customerInvoices.deletedAt),
          or(
            eq(customerInvoices.status, "draft"),
            eq(customerInvoices.status, "sent"),
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
      .where(and(isNull(salesOrders.deletedAt)));

    const confirmedOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(and(isNull(salesOrders.deletedAt)));

    const doneOrders = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(and(isNull(salesOrders.deletedAt)));

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
        draft: draftInvoices[0]?.count || 0,
        sent: sentInvoices[0]?.count || 0,
        paid: paidInvoices[0]?.count || 0,
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
        paidRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${customerInvoices.status} = 'paid' THEN ${customerInvoices.totalAmount} ELSE 0 END), 0)`,
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
        paidAmount: sql<string>`COALESCE(SUM(CASE WHEN ${customerInvoices.status} = 'paid' THEN ${customerInvoices.totalAmount} ELSE 0 END), 0)`,
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

// Get status distribution for chart
export const getPaymentStatusDistributionFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .handler(async () => {
    const distribution = await db
      .select({
        status: customerInvoices.status,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(${customerInvoices.totalAmount}), 0)`,
      })
      .from(customerInvoices)
      .where(isNull(customerInvoices.deletedAt))
      .groupBy(customerInvoices.status);

    return distribution;
  });
