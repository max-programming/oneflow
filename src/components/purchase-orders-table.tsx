import * as React from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
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
  getPurchaseOrdersFn,
  createPurchaseOrderFn,
  deletePurchaseOrderFn,
} from "@/server/purchase-orders";
import { getVendorsFn } from "@/server/vendors";
import { getProjectsFn } from "@/server/projects";

type PurchaseOrders = Awaited<ReturnType<typeof getPurchaseOrdersFn>>;

function PurchaseOrderCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    vendorId: "",
    projectId: "",
    description: "",
    amount: "",
    taxPercentage: "18",
    orderDate: new Date().toISOString().split("T")[0],
    status: "draft" as "draft" | "confirmed" | "done" | "cancelled",
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

  React.useEffect(() => {
    if (!open) {
      setFormData({
        vendorId: "",
        projectId: "",
        description: "",
        amount: "",
        taxPercentage: "18",
        orderDate: new Date().toISOString().split("T")[0],
        status: "draft",
      });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createPurchaseOrderFn,
    onSuccess: () => {
      toast.success("Purchase order created successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create purchase order",
      );
    },
  });

  function handleCreate() {
    if (!formData.vendorId || !formData.amount || !formData.orderDate) {
      toast.error("Vendor, amount, and order date are required");
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
          Create Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Create a new purchase order for a vendor.
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
            <Label htmlFor="orderDate" className="text-right">
              Order Date *
            </Label>
            <Input
              id="orderDate"
              type="date"
              value={formData.orderDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, orderDate: e.target.value }))
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
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="done">Done</SelectItem>
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
            {createMutation.isPending
              ? "Creating..."
              : "Create Purchase Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PurchaseOrderDeleteDialogProps {
  purchaseOrder: PurchaseOrders[number];
}

function PurchaseOrderDeleteDialog({
  purchaseOrder,
}: PurchaseOrderDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (purchaseOrderId: string) =>
      deletePurchaseOrderFn({ data: { purchaseOrderId } }),
    onSuccess: () => {
      toast.success("Purchase order deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete purchase order",
      );
    },
  });

  function handleDelete() {
    deleteMutation.mutate(purchaseOrder.id);
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
            purchase order "{purchaseOrder.poNumber}".
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

export function PurchaseOrdersTable() {
  const {
    data: purchaseOrders,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => getPurchaseOrdersFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load purchase orders",
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
        <PurchaseOrderCreateDialog />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
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
            ) : !purchaseOrders || purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchase orders found.
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.vendorName}</TableCell>
                  <TableCell>{po.projectName || "-"}</TableCell>
                  <TableCell>
                    ₹{parseFloat(po.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell>
                    {new Date(po.orderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PurchaseOrderDeleteDialog purchaseOrder={po} />
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
