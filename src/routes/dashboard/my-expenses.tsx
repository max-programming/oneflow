import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconPlus, IconCalendar, IconFileInvoice } from "@tabler/icons-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  getMyExpensesFn,
  createExpenseFn,
} from "@/server/expenses";
import { getProjectsFn } from "@/server/projects";

export const Route = createFileRoute("/dashboard/my-expenses")({
  component: RouteComponent,
});

type MyExpenses = Awaited<ReturnType<typeof getMyExpensesFn>>;

function ExpenseCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [expenseDateOpen, setExpenseDateOpen] = React.useState(false);
  const [expenseDate, setExpenseDate] = React.useState<Date | undefined>(new Date());
  const [formData, setFormData] = React.useState({
    projectId: "",
    description: "",
    category: "",
    amount: "",
    taxPercentage: "0",
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
      queryClient.invalidateQueries({ queryKey: ["my-expenses"] });
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
        projectId: formData.projectId || null,
        expenseDate: expenseDate.toISOString().split("T")[0],
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4 mr-2" />
          Submit Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Expense</DialogTitle>
          <DialogDescription>
            Submit an expense for approval by your project manager.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right">
              Project *
            </Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, projectId: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select project" />
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
              placeholder="Tax percentage (default: 0)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expenseDate" className="text-right">
              Expense Date *
            </Label>
            <Popover open={expenseDateOpen} onOpenChange={setExpenseDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start font-normal">
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

function ExpensesTable({ status }: { status?: "pending" | "approved" | "rejected" }) {
  const {
    data: expenses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["my-expenses", status],
    queryFn: () => getMyExpensesFn({ data: status ? { approvalStatus: status } : undefined }),
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expense #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
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
                No expenses found.
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">
                  {expense.expenseNumber}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate" title={expense.description}>
                    {expense.description}
                  </div>
                </TableCell>
                <TableCell>
                  {expense.projectId ? (
                    <Link
                      to="/dashboard/projects/$projectId"
                      params={{ projectId: expense.projectId }}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {expense.projectName}
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{expense.category || "-"}</TableCell>
                <TableCell>
                  ₹{parseFloat(expense.totalAmount).toLocaleString()}
                </TableCell>
                <TableCell>
                  {expense.billable ? (
                    <Badge variant="outline" className="bg-blue-50">Billable</Badge>
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
                      <span className="text-xs">{expense.invoiceNumber}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-[150px]">
                  {expense.notes ? (
                    <div className="truncate text-xs text-muted-foreground" title={expense.notes}>
                      {expense.notes}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RouteComponent() {
  const {
    data: allExpenses,
  } = useQuery({
    queryKey: ["my-expenses"],
    queryFn: () => getMyExpensesFn(),
    staleTime: 5 * 60 * 1000,
  });

  const totalExpenses = allExpenses?.length || 0;
  const pendingExpenses = allExpenses?.filter(e => e.approvalStatus === "pending").length || 0;
  const approvedExpenses = allExpenses?.filter(e => e.approvalStatus === "approved").length || 0;
  const rejectedExpenses = allExpenses?.filter(e => e.approvalStatus === "rejected").length || 0;
  const totalAmount = allExpenses?.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0) || 0;
  const approvedAmount = allExpenses?.filter(e => e.approvalStatus === "approved").reduce((sum, e) => sum + parseFloat(e.totalAmount), 0) || 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                My Expenses
              </h2>
              <p className="text-muted-foreground">
                Track and manage your submitted expenses
              </p>
            </div>
            <ExpenseCreateDialog />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total</CardDescription>
                <CardTitle className="text-2xl">{totalExpenses}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">{pendingExpenses}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-2xl text-green-600">{approvedExpenses}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Rejected</CardDescription>
                <CardTitle className="text-2xl text-red-600">{rejectedExpenses}</CardTitle>
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
                <CardDescription>Approved Amount</CardDescription>
                <CardTitle className="text-2xl text-green-600">₹{approvedAmount.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Expenses</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <ExpensesTable />
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <ExpensesTable status="pending" />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <ExpensesTable status="approved" />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <ExpensesTable status="rejected" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
