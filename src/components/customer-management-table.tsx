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
  getCustomersFn,
  updateCustomerFn,
  deleteCustomerFn,
  createCustomerFn,
} from "@/server/customer";

type Customers = Awaited<ReturnType<typeof getCustomersFn>>;

// Skeleton component for table rows
function CustomerTableRowSkeleton() {
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

interface CustomerCreateDialogProps {}

function CustomerCreateDialog() {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
  });
  const queryClient = useQueryClient();

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        email: "",
        phone: "",
      });
    }
  }, [open]);

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone: string }) =>
      createCustomerFn({ data }),
    onSuccess: () => {
      toast.success("Customer created successfully");
      setOpen(false);
      // Invalidate customers query to refetch data
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create customer",
      );
    },
  });

  function handleCreate() {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      toast.error("All fields are required");
      return;
    }

    createCustomerMutation.mutate(formData);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to the system.
          </DialogDescription>
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
              placeholder="Enter customer name"
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
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreate}
            disabled={createCustomerMutation.isPending}
          >
            {createCustomerMutation.isPending
              ? "Creating..."
              : "Create Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerEditDialogProps {
  customer: Customers[number];
}

function CustomerEditDialog({ customer }: CustomerEditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  });
  const queryClient = useQueryClient();

  // Reset form data when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      });
    }
  }, [open, customer]);

  const updateCustomerMutation = useMutation({
    mutationFn: (data: {
      customerId: string;
      name?: string;
      email?: string;
      phone?: string;
    }) => updateCustomerFn({ data }),
    onSuccess: () => {
      toast.success("Customer updated successfully");
      setOpen(false);
      // Invalidate customers query to refetch data
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer",
      );
    },
  });

  function handleSave() {
    // Check what fields have changed
    const updates: any = { customerId: customer.id };

    if (formData.name !== customer.name) updates.name = formData.name;
    if (formData.email !== customer.email) updates.email = formData.email;
    if (formData.phone !== customer.phone) updates.phone = formData.phone;

    // Only update if something changed
    if (Object.keys(updates).length > 1) {
      updateCustomerMutation.mutate(updates);
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
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information.</DialogDescription>
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
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={updateCustomerMutation.isPending}
          >
            {updateCustomerMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerDeleteDialogProps {
  customer: Customers[number];
}

function CustomerDeleteDialog({ customer }: CustomerDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) =>
      deleteCustomerFn({ data: { customerId } }),
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      // Invalidate customers query to refetch data
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer",
      );
    },
  });

  function handleDelete() {
    deleteCustomerMutation.mutate(customer.id);
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
            customer "{customer.name}" and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteCustomerMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteCustomerMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CustomerManagementTable() {
  const {
    data: customers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomersFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Show error toast if query fails
  React.useEffect(() => {
    if (isError) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load customers",
      );
    }
  }, [isError, error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <CustomerCreateDialog />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Show skeleton rows while loading
              Array.from({ length: 5 }).map((_, index) => (
                <CustomerTableRowSkeleton key={index} />
              ))
            ) : !customers || customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CustomerEditDialog customer={customer} />
                      <CustomerDeleteDialog customer={customer} />
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
