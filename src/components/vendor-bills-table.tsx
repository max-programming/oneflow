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

import { getVendorBillsFn } from "@/server/vendor-bills";

export function VendorBillsTable() {
  const {
    data: bills,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendorBills"],
    queryFn: () => getVendorBillsFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load vendor bills",
      );
    }
  }, [isError, error]);

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      unpaid: "destructive",
      partially_paid: "secondary",
      fully_paid: "default",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button>
          <IconPlus className="h-4 w-4" />
          Create Vendor Bill
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Due Date</TableHead>
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
            ) : !bills || bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No vendor bills found.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.billNumber}</TableCell>
                  <TableCell>{bill.vendorName}</TableCell>
                  <TableCell>{bill.projectName || "-"}</TableCell>
                  <TableCell>
                    ₹{parseFloat(bill.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(bill.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {new Date(bill.dueDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
