import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getMonthlyRevenueTrendFn } from "@/server/sales-finance-dashboard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function SalesFinanceRevenueChart() {
  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ["monthly-revenue-trend"],
    queryFn: () => getMonthlyRevenueTrendFn(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = monthlyData.map((item) => ({
    month: new Date(item.month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    totalRevenue: parseFloat(item.totalRevenue),
    paidRevenue: parseFloat(item.paidRevenue),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue Trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Revenue overview for the last 6 months
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [
                  `₹${value.toLocaleString()}`,
                  "",
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total Revenue"
              />
              <Area
                type="monotone"
                dataKey="paidRevenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorPaid)"
                name="Paid Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
