import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { getSalesOrdersFn } from "@/server/sales-orders";

export function SalesOrdersTable() {
  const {
    data: salesOrders,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["salesOrders"],
    queryFn: () => getSalesOrdersFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load sales orders",
      );
    }
  }, [isError, error]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      confirmed: "default",
      done: "outline",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button>
          <IconPlus className="h-4 w-4" />
          Create Sales Order
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SO Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !salesOrders || salesOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No sales orders found.
                </TableCell>
              </TableRow>
            ) : (
              salesOrders.map((so) => (
                <TableRow key={so.id}>
                  <TableCell className="font-medium">{so.orderNumber}</TableCell>
                  <TableCell>{so.customerName}</TableCell>
                  <TableCell>{so.projectName || "-"}</TableCell>
                  <TableCell>₹{parseFloat(so.totalAmount).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(so.status)}</TableCell>
                  <TableCell>{new Date(so.orderDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
