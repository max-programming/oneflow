import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getAllProjectsFinancialSummaryFn } from "@/server/financial-summary";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";

export function DashboardFinancialSummary() {
  const { data: financialSummary, isLoading } = useQuery({
    queryKey: ["all-projects-financial-summary"],
    queryFn: () => getAllProjectsFinancialSummaryFn(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Financial Summary (All Projects)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <TrendingUp className="h-4 w-4" />
                Total Revenue
              </div>
              <div className="text-3xl font-bold text-green-900">
                ₹
                {parseFloat(
                  financialSummary.totalRevenue,
                ).toLocaleString()}
              </div>
              <div className="text-xs text-green-600">
                Paid: ₹
                {parseFloat(financialSummary.paidRevenue).toLocaleString()}
                {" • "}
                Unpaid: ₹
                {parseFloat(
                  financialSummary.unpaidRevenue,
                ).toLocaleString()}
              </div>
            </div>

            {/* Costs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                <TrendingDown className="h-4 w-4" />
                Total Costs
              </div>
              <div className="text-3xl font-bold text-orange-900">
                ₹{parseFloat(financialSummary.totalCost).toLocaleString()}
              </div>
              <div className="text-xs text-orange-600">
                From vendor bills & approved expenses
              </div>
            </div>

            {/* Profit */}
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  isProfitable ? "text-blue-700" : "text-red-700"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                Total Profit
              </div>
              <div
                className={`text-3xl font-bold ${
                  isProfitable ? "text-blue-900" : "text-red-900"
                }`}
              >
                {isProfitable ? "+" : ""}₹
                {Math.abs(profit).toLocaleString()}
              </div>
              <div
                className={`text-xs ${
                  isProfitable ? "text-blue-600" : "text-red-600"
                }`}
              >
                Profit Margin: {isProfitable ? "+" : ""}
                {profitMargin}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
