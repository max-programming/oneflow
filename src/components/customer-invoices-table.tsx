import * as React from "react";
import { IconPlus, IconTrash, IconCash, IconCalendar } from "@tabler/icons-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  getCustomerInvoicesFn,
  createCustomerInvoiceFn,
  deleteCustomerInvoiceFn,
  recordPaymentFn,
} from "@/server/customer-invoices";
import { getCustomersFn } from "@/server/customer";
import { getProjectsFn } from "@/server/projects";
import { getSalesOrdersFn } from "@/server/sales-orders";
import { getPaymentBadgeVariant, getPaymentStatusMessage } from "@/lib/financial-utils";

type CustomerInvoices = Awaited<ReturnType<typeof getCustomerInvoicesFn>>;

function CustomerInvoiceCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [invoiceDateOpen, setInvoiceDateOpen] = React.useState(false);
  const [dueDateOpen, setDueDateOpen] = React.useState(false);
  const [invoiceDate, setInvoiceDate] = React.useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = React.useState<Date | undefined>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [formData, setFormData] = React.useState({
    customerId: "",
    projectId: "",
    salesOrderId: "",
    description: "",
    amount: "",
    taxPercentage: "18",
    status: "draft" as "draft" | "sent" | "paid" | "cancelled",
  });
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomersFn(),
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjectsFn(),
  });

  const { data: salesOrders } = useQuery({
    queryKey: ["salesOrders"],
    queryFn: () => getSalesOrdersFn(),
  });

  React.useEffect(() => {
    if (!open) {
      setFormData({
        customerId: "",
        projectId: "",
        salesOrderId: "",
        description: "",
        amount: "",
        taxPercentage: "18",
        status: "draft",
      });
      setInvoiceDate(new Date());
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createCustomerInvoiceFn,
    onSuccess: () => {
      toast.success("Customer invoice created successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create customer invoice",
      );
    },
  });

  function handleCreate() {
    if (
      !formData.customerId ||
      !formData.amount ||
      !invoiceDate ||
      !dueDate
    ) {
      toast.error("Customer, amount, invoice date, and due date are required");
      return;
    }

    createMutation.mutate({
      data: {
        ...formData,
        projectId: formData.projectId || null,
        salesOrderId: formData.salesOrderId ? parseInt(formData.salesOrderId) : null,
        invoiceDate: invoiceDate.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Customer Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a customer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer" className="text-right">
              Customer *
            </Label>
            <Select
              value={formData.customerId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, customerId: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label htmlFor="salesOrder" className="text-right">
              Sales Order
            </Label>
            <Select
              value={formData.salesOrderId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, salesOrderId: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Link to SO (optional)" />
              </SelectTrigger>
              <SelectContent>
                {salesOrders?.map((so) => (
                  <SelectItem key={so.id} value={so.id.toString()}>
                    {so.orderNumber} - ₹
                    {parseFloat(so.totalAmount).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="invoiceDate" className="text-right">
              Invoice Date *
            </Label>
            <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start font-normal">
                  {invoiceDate ? (
                    invoiceDate.toLocaleDateString("en-US", {
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
                  selected={invoiceDate}
                  onSelect={(date) => {
                    setInvoiceDate(date);
                    setInvoiceDateOpen(false);
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date *
            </Label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start font-normal">
                  {dueDate ? (
                    dueDate.toLocaleDateString("en-US", {
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
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setDueDateOpen(false);
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
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
              placeholder="Enter description (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RecordPaymentDialogProps {
  invoice: CustomerInvoices[number];
}

function RecordPaymentDialog({ invoice }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const queryClient = useQueryClient();

  const recordPaymentMutation = useMutation({
    mutationFn: recordPaymentFn,
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setOpen(false);
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment",
      );
    },
  });

  function handleRecordPayment() {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    recordPaymentMutation.mutate({
      data: {
        invoiceId: invoice.id,
        paymentAmount,
      },
    });
  }

  const remainingAmount =
    parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconCash className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Total Amount</Label>
            <div className="col-span-3 font-semibold">
              ₹{parseFloat(invoice.totalAmount).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Paid</Label>
            <div className="col-span-3 text-green-600">
              ₹{parseFloat(invoice.paidAmount).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Remaining</Label>
            <div className="col-span-3 text-orange-600 font-semibold">
              ₹{remainingAmount.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment" className="text-right">
              Payment Amount *
            </Label>
            <Input
              id="payment"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="col-span-3"
              placeholder="Enter payment amount"
              max={remainingAmount}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleRecordPayment}
            disabled={recordPaymentMutation.isPending}
          >
            {recordPaymentMutation.isPending
              ? "Recording..."
              : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerInvoiceDeleteDialogProps {
  invoice: CustomerInvoices[number];
}

function CustomerInvoiceDeleteDialog({
  invoice,
}: CustomerInvoiceDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      deleteCustomerInvoiceFn({ data: { invoiceId } }),
    onSuccess: () => {
      toast.success("Customer invoice deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["customerInvoices"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete customer invoice",
      );
    },
  });

  function handleDelete() {
    deleteMutation.mutate(invoice.id);
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
            invoice "{invoice.invoiceNumber}".
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


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Customer Invoices
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and track all customer invoices
          </p>
        </div>
        <CustomerInvoiceCreateDialog />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
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
            ) : !invoices || invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
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
                  <TableCell className="text-green-600">
                    ₹{parseFloat(invoice.paidAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentBadgeVariant(invoice.paymentStatus, invoice.dueDate)}>
                      {getPaymentStatusMessage(invoice.paymentStatus, invoice.dueDate)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {invoice.paymentStatus !== "fully_paid" && (
                        <RecordPaymentDialog invoice={invoice} />
                      )}
                      <CustomerInvoiceDeleteDialog invoice={invoice} />
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
