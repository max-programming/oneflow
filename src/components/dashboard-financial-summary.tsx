import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getAllProjectsFinancialSummaryFn } from "@/server/financial-summary";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardFinancialSummary() {
  const { data: financialSummary, isLoading } = useQuery({
    queryKey: ["all-projects-financial-summary"],
    queryFn: () => getAllProjectsFinancialSummaryFn(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="space-y-1 mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-5 rounded" />
                  </div>
                  <Skeleton className="h-9 w-32" />
                  <div className="pt-3 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!financialSummary) {
    return null;
  }

  const profit = parseFloat(financialSummary.totalProfit);
  const profitMargin = parseFloat(financialSummary.profitMargin);
  const isProfitable = profit >= 0;

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-1 mb-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Financial Summary
        </h2>
        <p className="text-sm text-muted-foreground">
          Overview of revenue, costs, and profitability across all projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <Card className="overflow-hidden border-green-200 dark:border-green-900/30">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </span>
                </div>
                <ArrowUpRight className="h-5 w-5 text-green-500" />
              </div>

              {/* Main Amount */}
              <div className="space-y-1">
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                  ₹{parseFloat(financialSummary.totalRevenue).toLocaleString()}
                </div>
              </div>

              {/* Breakdown */}
              <div className="pt-3 border-t border-green-100 dark:border-green-900/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ₹{parseFloat(financialSummary.paidRevenue).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Unpaid</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    ₹
                    {parseFloat(
                      financialSummary.unpaidRevenue,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card className="overflow-hidden border-orange-200 dark:border-orange-900/30">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Costs
                  </span>
                </div>
                <ArrowDownRight className="h-5 w-5 text-orange-500" />
              </div>

              {/* Main Amount */}
              <div className="space-y-1">
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                  ₹{parseFloat(financialSummary.totalCost).toLocaleString()}
                </div>
              </div>

              {/* Description */}
              <div className="pt-3 border-t border-orange-100 dark:border-orange-900/20">
                <p className="text-xs text-muted-foreground">
                  From vendor bills & approved expenses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card
          className={cn(
            "overflow-hidden",
            isProfitable
              ? "border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20"
              : "border-red-200 dark:border-red-900/30 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20",
          )}
        >
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isProfitable
                        ? "bg-blue-100 dark:bg-blue-900/20"
                        : "bg-red-100 dark:bg-red-900/20",
                    )}
                  >
                    <DollarSign
                      className={cn(
                        "h-5 w-5",
                        isProfitable
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Profit
                  </span>
                </div>
                {isProfitable ? (
                  <ArrowUpRight className="h-5 w-5 text-blue-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
              </div>

              {/* Main Amount */}
              <div className="space-y-1">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    isProfitable
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-red-700 dark:text-red-400",
                  )}
                >
                  {isProfitable ? "+" : "-"}₹{Math.abs(profit).toLocaleString()}
                </div>
              </div>

              {/* Profit Margin */}
              <div
                className={cn(
                  "pt-3 border-t",
                  isProfitable
                    ? "border-blue-100 dark:border-blue-900/20"
                    : "border-red-100 dark:border-red-900/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Profit Margin
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isProfitable
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {isProfitable ? "+" : ""}
                    {profitMargin}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
