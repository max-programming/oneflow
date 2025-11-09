import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  DollarSign,
  FileText,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

interface DashboardStats {
  invoices: {
    total: number;
    totalAmount: string;
    paidAmount: string;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  salesOrders: {
    total: number;
    totalAmount: string;
    draft: number;
    confirmed: number;
    done: number;
  };
  customers: {
    total: number;
  };
  recentActivity: {
    invoicesLast7Days: number;
    salesOrdersLast7Days: number;
  };
}

interface SalesFinanceStatsCardsProps {
  statistics?: DashboardStats;
  isLoading?: boolean;
}

export function SalesFinanceStatsCards({
  statistics,
  isLoading,
}: SalesFinanceStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  const totalRevenue = parseFloat(statistics.invoices.totalAmount);
  const paidRevenue = parseFloat(statistics.invoices.paidAmount);
  const unpaidRevenue = totalRevenue - paidRevenue;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-green-600 dark:text-green-400">
              ₹{paidRevenue.toLocaleString()} paid
            </p>
            <span className="text-xs text-muted-foreground">•</span>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              ₹{unpaidRevenue.toLocaleString()} pending
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.invoices.total}</div>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Badge variant="default" className="text-xs">
              {statistics.invoices.paid} Paid
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {statistics.invoices.sent} Sent
            </Badge>
            <Badge variant="outline" className="text-xs">
              {statistics.invoices.draft} Draft
            </Badge>
          </div>
          {statistics.invoices.overdue > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <p className="text-xs text-red-500">
                {statistics.invoices.overdue} overdue
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Orders Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.salesOrders.total}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ₹{parseFloat(statistics.salesOrders.totalAmount).toLocaleString()}{" "}
            total value
          </p>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {statistics.salesOrders.draft} Draft
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {statistics.salesOrders.confirmed} Confirmed
            </Badge>
            <Badge variant="default" className="text-xs">
              {statistics.salesOrders.done} Done
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Customers Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.customers.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Total customers</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <p className="text-xs text-green-600 dark:text-green-400">
              {statistics.recentActivity.invoicesLast7Days} new invoices (7d)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
