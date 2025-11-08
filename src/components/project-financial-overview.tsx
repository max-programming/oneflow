import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getProjectFinancialSummaryFn } from "@/server/financial-summary";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface ProjectFinancialOverviewProps {
  projectId: string;
}

export function ProjectFinancialOverview({
  projectId,
}: ProjectFinancialOverviewProps) {
  const { data: financialSummary, isLoading } = useQuery({
    queryKey: ["project-financial-summary", projectId],
    queryFn: () => getProjectFinancialSummaryFn({ data: { projectId } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!financialSummary) {
    return null;
  }

  const profit = parseFloat(financialSummary.profit.amount);
  const profitMargin = parseFloat(financialSummary.profit.margin);
  const isProfitable = profit >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <TrendingUp className="h-4 w-4" />
                Revenue
              </div>
              <div className="text-2xl font-bold text-green-900">
                ₹{parseFloat(financialSummary.revenue.total).toLocaleString()}
              </div>
              <div className="text-xs text-green-600">
                {financialSummary.revenue.invoiceCount} invoice
                {financialSummary.revenue.invoiceCount !== 1 ? "s" : ""}
                {" • "}
                ₹
                {parseFloat(financialSummary.revenue.unpaid).toLocaleString()}{" "}
                unpaid
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                <TrendingDown className="h-4 w-4" />
                Costs
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ₹{parseFloat(financialSummary.costs.total).toLocaleString()}
              </div>
              <div className="text-xs text-orange-600">
                Bills: ₹
                {parseFloat(
                  financialSummary.costs.vendorBills,
                ).toLocaleString()}
                {" • "}
                Expenses: ₹
                {parseFloat(financialSummary.costs.expenses).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Card */}
        <Card
          className={
            isProfitable
              ? "border-blue-200 bg-blue-50/50"
              : "border-red-200 bg-red-50/50"
          }
        >
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  isProfitable ? "text-blue-700" : "text-red-700"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                Profit
              </div>
              <div
                className={`text-2xl font-bold ${
                  isProfitable ? "text-blue-900" : "text-red-900"
                }`}
              >
                {isProfitable ? "+" : ""}₹{Math.abs(profit).toLocaleString()}
              </div>
              <div
                className={`text-xs ${
                  isProfitable ? "text-blue-600" : "text-red-600"
                }`}
              >
                Margin: {isProfitable ? "+" : ""}
                {profitMargin}%
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
