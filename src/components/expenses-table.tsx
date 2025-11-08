import * as React from "react";
import { IconPlus, IconCheck, IconX, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import {
  getExpensesFn,
  createExpenseFn,
  approveExpenseFn,
  rejectExpenseFn,
  deleteExpenseFn,
} from "@/server/expenses";
import { getProjectsFn } from "@/server/projects";

type Expenses = Awaited<ReturnType<typeof getExpensesFn>>;

function ExpenseCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    projectId: "",
    description: "",
    category: "",
    amount: "",
    taxPercentage: "0",
    expenseDate: new Date().toISOString().split("T")[0],
    billable: false,
  });
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjectsFn(),
  });

  React.useEffect(() => {
    if (!open) {
      setFormData({
        projectId: "",
        description: "",
        category: "",
        amount: "",
        taxPercentage: "0",
        expenseDate: new Date().toISOString().split("T")[0],
        billable: false,
      });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createExpenseFn,
    onSuccess: () => {
      toast.success("Expense submitted successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit expense",
      );
    },
  });

  function handleCreate() {
    if (!formData.description || !formData.amount || !formData.expenseDate) {
      toast.error("Description, amount, and expense date are required");
      return;
    }

    createMutation.mutate({
      data: {
        ...formData,
        projectId: formData.projectId || null,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4" />
          Submit Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
          <DialogDescription>
            Submit an expense for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Project
            </Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, projectId: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              placeholder="Enter category (optional)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount *
            </Label>
            <Input
              id="amount"
              type="number"
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
            <Input
              id="expenseDate"
              type="date"
              value={formData.expenseDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expenseDate: e.target.value,
                }))
              }
              className="col-span-3"
            />
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
                This expense is billable to a client
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
  expense: Expenses[number];
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
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
        <Button variant="ghost" size="sm" className="text-green-600">
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
  expense: Expenses[number];
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
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
        <Button variant="ghost" size="sm" className="text-red-600">
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
  expense: Expenses[number];
}

function ExpenseDeleteDialog({ expense }: ExpenseDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) =>
      deleteExpenseFn({ data: { expenseId } }),
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
        <Button variant="ghost" size="sm">
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
        <ExpenseCreateDialog />
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
              <TableHead className="w-[120px]">Actions</TableHead>
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
                <TableCell colSpan={9} className="h-24 text-center">
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {expense.approvalStatus === "pending" && (
                        <>
                          <ApproveExpenseDialog expense={expense} />
                          <RejectExpenseDialog expense={expense} />
                        </>
                      )}
                      <ExpenseDeleteDialog expense={expense} />
                    </div>
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
