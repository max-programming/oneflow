import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTopCustomersFn } from "@/server/sales-finance-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function SalesFinanceCustomerList() {
  const { data: topCustomers, isLoading } = useQuery({
    queryKey: ["top-customers", 10],
    queryFn: () => getTopCustomersFn({ data: { limit: 10 } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
                <Skeleton className="h-5 w-[80px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topCustomers || topCustomers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No customer data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const customersWithRevenue = topCustomers.filter(
    (c) => parseFloat(c.totalRevenue) > 0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Top Customers by Revenue</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard/admin/customers">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customersWithRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No customer revenue data yet
            </div>
          ) : (
            customersWithRevenue.map((customer, index) => {
              const revenue = parseFloat(customer.totalRevenue);
              const paid = parseFloat(customer.paidAmount);
              const pending = revenue - paid;
              const paymentRate = revenue > 0 ? (paid / revenue) * 100 : 0;

              return (
                <div
                  key={customer.customerId}
                  className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <p className="text-sm font-medium leading-none">
                        {customer.customerName}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      {customer.customerEmail}
                    </p>
                    <div className="flex items-center gap-2 ml-7">
                      <Badge variant="outline" className="text-xs">
                        {customer.invoiceCount} invoices
                      </Badge>
                      <Badge
                        variant={
                          paymentRate >= 100
                            ? "default"
                            : paymentRate >= 50
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {paymentRate.toFixed(0)}% paid
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold">
                      ₹{revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{pending.toLocaleString()} pending
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
