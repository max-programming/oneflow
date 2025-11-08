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

import { getCustomerInvoicesFn } from "@/server/customer-invoices";

export function CustomerInvoicesTable() {
  const {
    data: invoices,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["customerInvoices"],
    queryFn: () => getCustomerInvoicesFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load customer invoices",
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
          Create Invoice
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
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
            ) : !invoices || invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No customer invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{invoice.projectName || "-"}</TableCell>
                  <TableCell>
                    ₹{parseFloat(invoice.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(invoice.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString()}
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
