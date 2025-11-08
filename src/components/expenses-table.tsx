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

import { getExpensesFn } from "@/server/expenses";

export function ExpensesTable() {
  const {
    data: expenses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => getExpensesFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load expenses",
      );
    }
  }, [isError, error]);

  const getApprovalStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button>
          <IconPlus className="h-4 w-4" />
          Submit Expense
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense #</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 8 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !expenses || expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No expenses found.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {expense.expenseNumber}
                  </TableCell>
                  <TableCell>{expense.userName}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell>{expense.projectName || "-"}</TableCell>
                  <TableCell>
                    ₹{parseFloat(expense.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {expense.billable ? (
                      <Badge variant="outline">Billable</Badge>
                    ) : (
                      <Badge variant="secondary">Non-billable</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getApprovalStatusBadge(expense.approvalStatus)}
                  </TableCell>
                  <TableCell>
                    {new Date(expense.expenseDate).toLocaleDateString()}
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
