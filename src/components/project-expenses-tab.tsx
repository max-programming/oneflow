import * as React from "react";
import {
  IconPlus,
  IconCheck,
  IconX,
  IconTrash,
  IconCalendar,
  IconFileInvoice,
} from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getProjectExpensesFn,
  createExpenseFn,
  approveExpenseFn,
  rejectExpenseFn,
  deleteExpenseFn,
} from "@/server/expenses";

type ProjectExpenses = Awaited<ReturnType<typeof getProjectExpensesFn>>;

interface ProjectExpensesTabProps {
  projectId: number;
  canManageExpenses: boolean; // PM or admin
}

interface ExpenseCreateDialogProps {
  projectId: number;
}

function ExpenseCreateDialog({ projectId }: ExpenseCreateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [expenseDateOpen, setExpenseDateOpen] = React.useState(false);
  const [expenseDate, setExpenseDate] = React.useState<Date | undefined>(
    new Date(),
  );
  const [formData, setFormData] = React.useState({
    description: "",
    category: "",
    amount: "",
    taxPercentage: "0",
    billable: false,
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!open) {
      setFormData({
        description: "",
        category: "",
        amount: "",
        taxPercentage: "0",
        billable: false,
      });
      setExpenseDate(new Date());
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createExpenseFn,
    onSuccess: () => {
      toast.success("Expense submitted successfully");
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["project-expenses", projectId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit expense",
      );
    },
  });

  function handleCreate() {
    if (!formData.description || !formData.amount || !expenseDate) {
      toast.error("Description, amount, and expense date are required");
      return;
    }

    createMutation.mutate({
      data: {
        ...formData,
        projectId,
        expenseDate: expenseDate.toISOString().split("T")[0],
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <IconPlus className="h-4 w-4 mr-1" />
          Submit Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
          <DialogDescription>
            Submit an expense for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="col-span-3"
              placeholder="Enter expense description"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="col-span-3"
              placeholder="e.g., Travel, Tools, Meals"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="col-span-3"
              placeholder="Enter amount"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tax" className="text-right">
              Tax %
            </Label>
            <Input
              id="tax"
              type="number"
              step="0.01"
              value={formData.taxPercentage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  taxPercentage: e.target.value,
                }))
              }
              className="col-span-3"
              placeholder="Tax percentage"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseDate" className="text-right">
              Expense Date *
            </Label>
            <Popover open={expenseDateOpen} onOpenChange={setExpenseDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="col-span-3 justify-start font-normal"
                >
                  {expenseDate ? (
                    expenseDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  ) : (
                    <span className="text-muted-foreground">Select date</span>
                  )}
                  <IconCalendar className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expenseDate}
                  onSelect={(date) => {
                    setExpenseDate(date);
                    setExpenseDateOpen(false);
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="billable" className="text-right">
              Billable
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    billable: checked === true,
                  }))
                }
              />
              <Label htmlFor="billable" className="text-sm font-normal">
                This expense should be billed to the client
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Submitting..." : "Submit Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ApproveExpenseDialogProps {
  expense: ProjectExpenses[number];
  projectId: number;
}

function ApproveExpenseDialog({
  expense,
  projectId,
}: ApproveExpenseDialogProps) {
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
      queryClient.invalidateQueries({
        queryKey: ["project-expenses", projectId],
      });
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
        <Button
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
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
            <Label className="text-right font-medium">Description:</Label>
            <div className="col-span-3">{expense.description}</div>
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
                <Badge variant="outline">
                  Yes - Will create customer invoice
                </Badge>
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
  expense: ProjectExpenses[number];
  projectId: number;
}

function RejectExpenseDialog({ expense, projectId }: RejectExpenseDialogProps) {
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
      queryClient.invalidateQueries({
        queryKey: ["project-expenses", projectId],
      });
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
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
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

interface ExpenseDeleteDialogProps {
  expense: ProjectExpenses[number];
  projectId: number;
}

function ExpenseDeleteDialog({ expense, projectId }: ExpenseDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (expenseId: number) => deleteExpenseFn({ data: { expenseId } }),
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["project-expenses", projectId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete expense",
      );
    },
  });

  function handleDelete() {
    deleteMutation.mutate(expense.id);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-red-50 hover:text-red-600"
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            expense "{expense.expenseNumber}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProjectExpensesTab({
  projectId,
  canManageExpenses,
}: ProjectExpensesTabProps) {
  const {
    data: expenses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["project-expenses", projectId],
    queryFn: () => getProjectExpensesFn({ data: { projectId } }),
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

  // Calculate summary stats
  const totalExpenses = expenses?.length || 0;
  const pendingExpenses =
    expenses?.filter((e) => e.approvalStatus === "pending").length || 0;
  const approvedExpenses =
    expenses?.filter((e) => e.approvalStatus === "approved").length || 0;
  const approvedAmount =
    expenses
      ?.filter((e) => e.approvalStatus === "approved")
      .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl">{totalExpenses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {pendingExpenses}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {approvedExpenses}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount (Approved)</CardDescription>
            <CardTitle className="text-2xl">
              ₹{approvedAmount.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Expenses</CardTitle>
              <CardDescription>
                Manage expenses for this project
              </CardDescription>
            </div>
            <ExpenseCreateDialog projectId={projectId} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense #</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 10 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !expenses || expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      No expenses found for this project.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.expenseNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{expense.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {expense.userEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={expense.description}>
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell>{expense.category || "-"}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        {getApprovalStatusBadge(expense.approvalStatus)}
                      </TableCell>
                      <TableCell>
                        {expense.invoiceNumber ? (
                          <Link
                            to="/dashboard/settings/customer-invoices"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <IconFileInvoice className="h-3 w-3" />
                            <span className="text-xs">
                              {expense.invoiceNumber}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {expense.approvalStatus === "pending" &&
                            canManageExpenses && (
                              <>
                                <ApproveExpenseDialog
                                  expense={expense}
                                  projectId={projectId}
                                />
                                <RejectExpenseDialog
                                  expense={expense}
                                  projectId={projectId}
                                />
                              </>
                            )}
                          <ExpenseDeleteDialog
                            expense={expense}
                            projectId={projectId}
                          />
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
  );
}
