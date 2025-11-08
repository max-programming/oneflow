import { db } from "@/db";
import { customers } from "@/db/tables/projects";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  salesFinanceOrAdmin,
} from "./auth-middleware";

// Create Customer - Sales/Finance and Admins can create customers
export const createCustomerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      name: z.string().min(1, "Customer name is required"),
      email: z.email(),
      phone: z.string().min(1, "Phone number is required"),
    }),
  )
  .handler(async ({ data }) => {
    // Check if email or phone already exists (excluding deleted customers)
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(and(eq(customers.email, data.email), isNull(customers.deletedAt)))
      .limit(1);

    if (existingCustomer.length > 0) {
      throw new Error("Email already in use");
    }

    const existingPhone = await db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, data.phone), isNull(customers.deletedAt)))
      .limit(1);

    if (existingPhone.length > 0) {
      throw new Error("Phone number already in use");
    }

    const [customer] = await db
      .insert(customers)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
      })
      .returning();

    if (!customer) {
      throw new Error("Failed to create customer");
    }

    return customer;
  });

// Get All Customers - All authenticated users can view (excluding deleted)
export const getCustomersFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    const allCustomers = await db
      .select()
      .from(customers)
      .where(isNull(customers.deletedAt))
      .orderBy(customers.createdAt);

    return allCustomers;
  });

// Get Customer by ID - All authenticated users can view (excluding deleted)
export const getCustomerByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      customerId: z.uuid("Invalid customer ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, data.customerId), isNull(customers.deletedAt)))
      .limit(1);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  });

// Update Customer - Sales/Finance and Admins can update
export const updateCustomerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      customerId: z.uuid("Invalid customer ID"),
      name: z.string().min(1, "Customer name is required").optional(),
      email: z.string().email().optional(),
      phone: z.string().min(1, "Phone number is required").optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { customerId, ...updateData } = data;

    // Check if email is being updated and if it already exists (excluding deleted)
    if (updateData.email) {
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(and(eq(customers.email, updateData.email), isNull(customers.deletedAt)))
        .limit(1);

      if (
        existingCustomer.length > 0 &&
        existingCustomer[0].id !== customerId
      ) {
        throw new Error("Email already in use");
      }
    }

    // Check if phone is being updated and if it already exists (excluding deleted)
    if (updateData.phone) {
      const existingPhone = await db
        .select()
        .from(customers)
        .where(and(eq(customers.phone, updateData.phone), isNull(customers.deletedAt)))
        .limit(1);

      if (existingPhone.length > 0 && existingPhone[0].id !== customerId) {
        throw new Error("Phone number already in use");
      }
    }

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, customerId))
      .returning();

    if (!updatedCustomer) {
      throw new Error("Failed to update customer");
    }

    return updatedCustomer;
  });

// Delete Customer (Soft Delete) - Sales/Finance and Admins can delete
export const deleteCustomerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      customerId: z.uuid("Invalid customer ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedCustomer] = await db
      .update(customers)
      .set({ deletedAt: new Date() })
      .where(and(eq(customers.id, data.customerId), isNull(customers.deletedAt)))
      .returning();

    if (!deletedCustomer) {
      throw new Error("Customer not found");
    }

    return { success: true, message: "Customer deleted successfully" };
  });
