import { db } from "@/db";
import { vendors } from "@/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  allRoles,
  authMiddleware,
  salesFinanceOrAdmin,
} from "./auth-middleware";

// Create Vendor - Sales/Finance and Admins can create vendors
export const createVendorFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      name: z.string().min(1, "Vendor name is required"),
      email: z.email(),
      phone: z.string().min(1, "Phone number is required"),
      address: z.string().optional(),
      paymentTerms: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    // Check if email already exists (excluding deleted vendors)
    const existingVendor = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.email, data.email), isNull(vendors.deletedAt)))
      .limit(1);

    if (existingVendor.length > 0) {
      throw new Error("Email already in use");
    }

    const existingPhone = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.phone, data.phone), isNull(vendors.deletedAt)))
      .limit(1);

    if (existingPhone.length > 0) {
      throw new Error("Phone number already in use");
    }

    const [vendor] = await db
      .insert(vendors)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        paymentTerms: data.paymentTerms,
      })
      .returning();

    if (!vendor) {
      throw new Error("Failed to create vendor");
    }

    return vendor;
  });

// Get All Vendors - All authenticated users can view (excluding deleted)
export const getVendorsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .handler(async () => {
    const allVendors = await db
      .select()
      .from(vendors)
      .where(isNull(vendors.deletedAt))
      .orderBy(vendors.createdAt);

    return allVendors;
  });

// Get Vendor by ID - All authenticated users can view (excluding deleted)
export const getVendorByIdFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware, allRoles])
  .inputValidator(
    z.object({
      vendorId: z.number().int().positive("Invalid vendor ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, data.vendorId), isNull(vendors.deletedAt)))
      .limit(1);

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    return vendor;
  });

// Update Vendor - Sales/Finance and Admins can update
export const updateVendorFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      vendorId: z.number().int().positive("Invalid vendor ID"),
      name: z.string().min(1, "Vendor name is required").optional(),
      email: z.string().email().optional(),
      phone: z.string().min(1, "Phone number is required").optional(),
      address: z.string().optional(),
      paymentTerms: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { vendorId, ...updateData } = data;

    // Check if email is being updated and if it already exists (excluding deleted)
    if (updateData.email) {
      const existingVendor = await db
        .select()
        .from(vendors)
        .where(
          and(eq(vendors.email, updateData.email), isNull(vendors.deletedAt)),
        )
        .limit(1);

      if (existingVendor.length > 0 && existingVendor[0].id !== vendorId) {
        throw new Error("Email already in use");
      }
    }

    // Check if phone is being updated and if it already exists (excluding deleted)
    if (updateData.phone) {
      const existingPhone = await db
        .select()
        .from(vendors)
        .where(
          and(eq(vendors.phone, updateData.phone), isNull(vendors.deletedAt)),
        )
        .limit(1);

      if (existingPhone.length > 0 && existingPhone[0].id !== vendorId) {
        throw new Error("Phone number already in use");
      }
    }

    const [updatedVendor] = await db
      .update(vendors)
      .set(updateData)
      .where(eq(vendors.id, vendorId))
      .returning();

    if (!updatedVendor) {
      throw new Error("Failed to update vendor");
    }

    return updatedVendor;
  });

// Delete Vendor (Soft Delete) - Sales/Finance and Admins can delete
export const deleteVendorFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware, salesFinanceOrAdmin])
  .inputValidator(
    z.object({
      vendorId: z.number().int().positive("Invalid vendor ID"),
    }),
  )
  .handler(async ({ data }) => {
    const [deletedVendor] = await db
      .update(vendors)
      .set({ deletedAt: new Date() })
      .where(and(eq(vendors.id, data.vendorId), isNull(vendors.deletedAt)))
      .returning();

    if (!deletedVendor) {
      throw new Error("Vendor not found");
    }

    return { success: true, message: "Vendor deleted successfully" };
  });
