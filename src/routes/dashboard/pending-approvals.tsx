import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconCheck, IconX, IconFileInvoice } from "@tabler/icons-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getExpensesPendingMyApprovalFn,
  approveExpenseFn,
  rejectExpenseFn,
} from "@/server/expenses";

export const Route = createFileRoute("/dashboard/pending-approvals")({
  component: RouteComponent,
});

type PendingExpenses = Awaited<ReturnType<typeof getExpensesPendingMyApprovalFn>>;

interface ApproveExpenseDialogProps {
  expense: PendingExpenses[number];
}

function ApproveExpenseDialog({ expense }: ApproveExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!open) {
      setNotes("");
    }
  }, [open]);

  const approveMutation = useMutation({
    mutationFn: approveExpenseFn,
    onSuccess: () => {
      toast.success("Expense approved successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve expense",
      );
    },
  });

  function handleApprove() {
    approveMutation.mutate({
      data: {
        expenseId: expense.id,
        notes: notes || undefined,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
          <IconCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Expense</DialogTitle>
          <DialogDescription>
            Approve expense {expense.expenseNumber} submitted by{" "}
            {expense.userName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Project:</Label>
            <div className="col-span-3 font-medium">{expense.projectName}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Description:</Label>
            <div className="col-span-3">{expense.description}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Category:</Label>
            <div className="col-span-3">{expense.category || "-"}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Amount:</Label>
            <div className="col-span-3 text-lg font-semibold">
              ₹{parseFloat(expense.totalAmount).toLocaleString()}
            </div>
          </div>
          {expense.billable && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Billable:</Label>
              <div className="col-span-3">
                <Badge variant="outline" className="bg-blue-50">Yes - Will create customer invoice</Badge>
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="approvalNotes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="approvalNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Add approval notes (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending ? "Approving..." : "Approve Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RejectExpenseDialogProps {
  expense: PendingExpenses[number];
}

function RejectExpenseDialog({ expense }: RejectExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!open) {
      setNotes("");
    }
  }, [open]);

  const rejectMutation = useMutation({
    mutationFn: rejectExpenseFn,
    onSuccess: () => {
      toast.success("Expense rejected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject expense",
      );
    },
  });

  function handleReject() {
    if (!notes.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    rejectMutation.mutate({
      data: {
        expenseId: expense.id,
        notes,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <IconX className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reject Expense</DialogTitle>
          <DialogDescription>
            Reject expense {expense.expenseNumber} submitted by{" "}
            {expense.userName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Project:</Label>
            <div className="col-span-3 font-medium">{expense.projectName}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Description:</Label>
            <div className="col-span-3">{expense.description}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Amount:</Label>
            <div className="col-span-3 text-lg font-semibold">
              ₹{parseFloat(expense.totalAmount).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rejectionNotes" className="text-right">
              Reason *
            </Label>
            <Textarea
              id="rejectionNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Enter rejection reason (required)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleReject}
            disabled={rejectMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {rejectMutation.isPending ? "Rejecting..." : "Reject Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const {
    data: expenses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: () => getExpensesPendingMyApprovalFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load pending expenses",
      );
    }
  }, [isError, error]);

  const totalPending = expenses?.length || 0;
  const totalAmount = expenses?.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0) || 0;
  const billableCount = expenses?.filter(e => e.billable).length || 0;
  const nonBillableCount = expenses?.filter(e => !e.billable).length || 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Pending Approvals
            </h2>
            <p className="text-muted-foreground">
              Review and approve expenses from your managed projects
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending Expenses</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">{totalPending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Amount</CardDescription>
                <CardTitle className="text-2xl">₹{totalAmount.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Billable</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{billableCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Non-Billable</CardDescription>
                <CardTitle className="text-2xl">{nonBillableCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses Awaiting Your Approval</CardTitle>
              <CardDescription>
                Approve or reject expenses from projects you manage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense #</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 9 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : !expenses || expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <IconCheck className="h-8 w-8 text-green-500" />
                            <p className="text-lg font-medium">No pending approvals</p>
                            <p className="text-sm text-muted-foreground">
                              All expenses from your managed projects have been reviewed
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            {expense.expenseNumber}
                          </TableCell>
                          <TableCell>
                            {expense.projectId ? (
                              <Link
                                to="/dashboard/projects/$projectId"
                                params={{ projectId: expense.projectId }}
                                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                              >
                                {expense.projectName}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{expense.userName}</span>
                              <span className="text-xs text-muted-foreground">{expense.userEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate" title={expense.description}>
                              {expense.description}
                            </div>
                          </TableCell>
                          <TableCell>{expense.category || "-"}</TableCell>
                          <TableCell className="font-medium">
                            ₹{parseFloat(expense.totalAmount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {expense.billable ? (
                              <Badge variant="outline" className="bg-blue-50">
                                Billable
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Non-billable</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ApproveExpenseDialog expense={expense} />
                              <RejectExpenseDialog expense={expense} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
