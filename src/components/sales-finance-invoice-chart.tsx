import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getPaymentStatusDistributionFn } from "@/server/sales-finance-dashboard";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = {
  unpaid: "#ef4444", // red
  partially_paid: "#f59e0b", // amber
  fully_paid: "#10b981", // green
};

const STATUS_LABELS = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  fully_paid: "Fully Paid",
};

export function SalesFinanceInvoiceChart() {
  const { data: distribution, isLoading } = useQuery({
    queryKey: ["payment-status-distribution"],
    queryFn: () => getPaymentStatusDistributionFn(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!distribution || distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = distribution.map((item) => ({
    name:
      STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    value: item.count,
    amount: parseFloat(item.totalAmount),
    fill: COLORS[item.status as keyof typeof COLORS] || "#888888",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} invoices (₹${props.payload.amount.toLocaleString()})`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
