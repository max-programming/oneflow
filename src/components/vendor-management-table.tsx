import * as React from "react";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
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
import { Skeleton } from "@/components/ui/skeleton";

import {
  getVendorsFn,
  updateVendorFn,
  deleteVendorFn,
  createVendorFn,
} from "@/server/vendors";

type Vendors = Awaited<ReturnType<typeof getVendorsFn>>;

// Skeleton component for table rows
function VendorTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-[180px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[200px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[120px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[100px]" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
}

function VendorCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "",
  });
  const queryClient = useQueryClient();

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        paymentTerms: "",
      });
    }
  }, [open]);

  const createVendorMutation = useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      phone: string;
      address?: string;
      paymentTerms?: string;
    }) => createVendorFn({ data }),
    onSuccess: () => {
      toast.success("Vendor created successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor",
      );
    },
  });

  function handleCreate() {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      toast.error("Name, email, and phone are required");
      return;
    }

    createVendorMutation.mutate(formData);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4" />
          Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Vendor</DialogTitle>
          <DialogDescription>Add a new vendor to the system.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="col-span-3"
              placeholder="Enter vendor name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="col-span-3"
              placeholder="Enter email address"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="col-span-3"
              placeholder="Enter phone number"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              className="col-span-3"
              placeholder="Enter address (optional)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentTerms" className="text-right">
              Payment Terms
            </Label>
            <Input
              id="paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: e.target.value,
                }))
              }
              className="col-span-3"
              placeholder="e.g., Net 30 (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreate}
            disabled={createVendorMutation.isPending}
          >
            {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VendorEditDialogProps {
  vendor: Vendors[number];
}

function VendorEditDialog({ vendor }: VendorEditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address || "",
    paymentTerms: vendor.paymentTerms || "",
  });
  const queryClient = useQueryClient();

  // Reset form data when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address || "",
        paymentTerms: vendor.paymentTerms || "",
      });
    }
  }, [open, vendor]);

  const updateVendorMutation = useMutation({
    mutationFn: (data: {
      vendorId: number;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      paymentTerms?: string;
    }) => updateVendorFn({ data }),
    onSuccess: () => {
      toast.success("Vendor updated successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update vendor",
      );
    },
  });

  function handleSave() {
    const updates: any = { vendorId: vendor.id };

    if (formData.name !== vendor.name) updates.name = formData.name;
    if (formData.email !== vendor.email) updates.email = formData.email;
    if (formData.phone !== vendor.phone) updates.phone = formData.phone;
    if (formData.address !== vendor.address) updates.address = formData.address;
    if (formData.paymentTerms !== vendor.paymentTerms)
      updates.paymentTerms = formData.paymentTerms;

    // Only update if something changed
    if (Object.keys(updates).length > 1) {
      updateVendorMutation.mutate(updates);
    } else {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconPencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
          <DialogDescription>Update vendor information.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-name" className="text-right">
              Name
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-email" className="text-right">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-phone" className="text-right">
              Phone
            </Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-address" className="text-right">
              Address
            </Label>
            <Textarea
              id="edit-address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-paymentTerms" className="text-right">
              Payment Terms
            </Label>
            <Input
              id="edit-paymentTerms"
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: e.target.value,
                }))
              }
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={updateVendorMutation.isPending}
          >
            {updateVendorMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VendorDeleteDialogProps {
  vendor: Vendors[number];
}

function VendorDeleteDialog({ vendor }: VendorDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteVendorMutation = useMutation({
    mutationFn: (vendorId: number) => deleteVendorFn({ data: { vendorId } }),
    onSuccess: () => {
      toast.success("Vendor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vendor",
      );
    },
  });

  function handleDelete() {
    deleteVendorMutation.mutate(vendor.id);
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
            vendor "{vendor.name}" and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteVendorMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteVendorMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function VendorManagementTable() {
  const {
    data: vendors,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendorsFn(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load vendors",
      );
    }
  }, [isError, error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <VendorCreateDialog />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <VendorTableRowSkeleton key={index} />
              ))
            ) : !vendors || vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No vendors found.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>{vendor.paymentTerms || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <VendorEditDialog vendor={vendor} />
                      <VendorDeleteDialog vendor={vendor} />
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
