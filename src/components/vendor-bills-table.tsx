import * as React from "react";
import { IconPlus, IconCash, IconTrash } from "@tabler/icons-react";
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

import {
  getVendorBillsFn,
  createVendorBillFn,
  recordVendorBillPaymentFn,
  deleteVendorBillFn,
} from "@/server/vendor-bills";
import { getVendorsFn } from "@/server/vendors";
import { getProjectsFn } from "@/server/projects";
import { getPurchaseOrdersFn } from "@/server/purchase-orders";

type VendorBills = Awaited<ReturnType<typeof getVendorBillsFn>>;

function VendorBillCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    vendorId: "",
    projectId: "",
    purchaseOrderId: "",
    description: "",
    amount: "",
    taxPercentage: "18",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    status: "draft" as "draft" | "sent" | "paid" | "cancelled",
  });
  const queryClient = useQueryClient();

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendorsFn(),
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjectsFn(),
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => getPurchaseOrdersFn(),
  });

  // Filter purchase orders by selected vendor
  const filteredPurchaseOrders = React.useMemo(() => {
    if (!purchaseOrders || !formData.vendorId) return [];
    return purchaseOrders.filter((po) => po.vendorId === formData.vendorId);
  }, [purchaseOrders, formData.vendorId]);

  React.useEffect(() => {
    if (!open) {
      setFormData({
        vendorId: "",
        projectId: "",
        purchaseOrderId: "",
        description: "",
        amount: "",
        taxPercentage: "18",
        billDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "draft",
      });
    }
  }, [open]);

  // Reset PO selection when vendor changes
  React.useEffect(() => {
    setFormData((prev) => ({ ...prev, purchaseOrderId: "" }));
  }, [formData.vendorId]);

  const createMutation = useMutation({
    mutationFn: createVendorBillFn,
    onSuccess: () => {
      toast.success("Vendor bill created successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendorBills"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor bill",
      );
    },
  });

  function handleCreate() {
    if (!formData.vendorId || !formData.amount || !formData.billDate || !formData.dueDate) {
      toast.error("Vendor, amount, bill date, and due date are required");
      return;
    }

    createMutation.mutate({
      data: {
        ...formData,
        projectId: formData.projectId || null,
        purchaseOrderId: formData.purchaseOrderId || null,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4" />
          Create Vendor Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Vendor Bill</DialogTitle>
          <DialogDescription>
            Create a new vendor bill for payment tracking.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor" className="text-right">
              Vendor *
            </Label>
            <Select
              value={formData.vendorId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, vendorId: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors?.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
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
            <Label htmlFor="purchaseOrder" className="text-right">
              Purchase Order
            </Label>
            <Select
              value={formData.purchaseOrderId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, purchaseOrderId: value }))
              }
              disabled={!formData.vendorId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select PO (optional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredPurchaseOrders?.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.poNumber} - ₹{parseFloat(po.totalAmount).toLocaleString()}
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
            <Label htmlFor="billDate" className="text-right">
              Bill Date *
            </Label>
            <Input
              id="billDate"
              type="date"
              value={formData.billDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, billDate: e.target.value }))
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date *
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
              className="col-span-3"
            />
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
            {createMutation.isPending ? "Creating..." : "Create Vendor Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RecordPaymentDialogProps {
  bill: VendorBills[number];
}

function RecordPaymentDialog({ bill }: RecordPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const queryClient = useQueryClient();

  const totalAmount = parseFloat(bill.totalAmount);
  const paidAmount = parseFloat(bill.paidAmount);
  const remainingAmount = totalAmount - paidAmount;

  React.useEffect(() => {
    if (!open) {
      setPaymentAmount("");
    }
  }, [open]);

  const recordPaymentMutation = useMutation({
    mutationFn: recordVendorBillPaymentFn,
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendorBills"] });
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

    if (parseFloat(paymentAmount) > remainingAmount) {
      toast.error("Payment amount cannot exceed remaining amount");
      return;
    }

    recordPaymentMutation.mutate({
      data: {
        billId: bill.id,
        paymentAmount,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconCash className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for vendor bill {bill.billNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Total Amount:</Label>
            <div className="col-span-3 text-lg font-semibold">
              ₹{totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Paid Amount:</Label>
            <div className="col-span-3 text-lg font-semibold text-green-600">
              ₹{paidAmount.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Remaining:</Label>
            <div className="col-span-3 text-lg font-semibold text-orange-600">
              ₹{remainingAmount.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentAmount" className="text-right">
              Payment Amount *
            </Label>
            <Input
              id="paymentAmount"
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

interface VendorBillDeleteDialogProps {
  bill: VendorBills[number];
}

function VendorBillDeleteDialog({ bill }: VendorBillDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (billId: string) => deleteVendorBillFn({ data: { billId } }),
    onSuccess: () => {
      toast.success("Vendor bill deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendorBills"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vendor bill",
      );
    },
  });

  function handleDelete() {
    deleteMutation.mutate(bill.id);
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
            This action cannot be undone. This will permanently delete the vendor
            bill "{bill.billNumber}".
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
        <VendorBillCreateDialog />
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
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 7 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !bills || bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {bill.paymentStatus !== "fully_paid" && (
                        <RecordPaymentDialog bill={bill} />
                      )}
                      <VendorBillDeleteDialog bill={bill} />
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
