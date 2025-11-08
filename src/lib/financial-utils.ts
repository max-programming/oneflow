/**
 * Financial utility functions for invoice and bill management
 */

/**
 * Check if an invoice or bill is overdue
 * @param dueDate - The due date as a string (YYYY-MM-DD)
 * @param paymentStatus - The payment status (unpaid, partially_paid, fully_paid)
 * @returns True if the invoice/bill is overdue and not fully paid
 */
export function isOverdue(
  dueDate: string,
  paymentStatus: string,
): boolean {
  if (paymentStatus === "fully_paid") return false;

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due < today;
}

/**
 * Calculate the number of days an invoice or bill is overdue
 * @param dueDate - The due date as a string (YYYY-MM-DD)
 * @returns Number of days overdue (positive number)
 */
export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = today.getTime() - due.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return Math.max(0, days); // Return 0 if not yet due
}

/**
 * Get the appropriate badge variant based on payment status and due date
 * @param paymentStatus - The payment status
 * @param dueDate - The due date as a string
 * @returns Badge variant for UI display
 */
export function getPaymentBadgeVariant(
  paymentStatus: string,
  dueDate: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (paymentStatus === "fully_paid") return "default";
  if (isOverdue(dueDate, paymentStatus)) return "destructive";
  if (paymentStatus === "partially_paid") return "secondary";
  return "outline";
}

/**
 * Get a human-readable payment status message
 * @param paymentStatus - The payment status
 * @param dueDate - The due date as a string
 * @returns Human-readable status message
 */
export function getPaymentStatusMessage(
  paymentStatus: string,
  dueDate: string,
): string {
  if (paymentStatus === "fully_paid") {
    return "Paid";
  }

  if (isOverdue(dueDate, paymentStatus)) {
    const days = getDaysOverdue(dueDate);
    return `Overdue (${days}d)`;
  }

  if (paymentStatus === "partially_paid") {
    return "Partially Paid";
  }

  // Format due date nicely
  const due = new Date(dueDate);
  return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/**
 * Check if an invoice/bill can be edited based on its status
 * @param status - The document status (draft, sent, paid, cancelled)
 * @returns True if the document can be edited
 */
export function canEditDocument(status: string): boolean {
  return status === "draft" || status === "sent";
}

/**
 * Check if payments can be recorded for an invoice/bill
 * @param status - The document status
 * @param paymentStatus - The payment status
 * @returns True if payments can be recorded
 */
export function canRecordPayment(
  status: string,
  paymentStatus: string,
): boolean {
  // Cannot record payments for cancelled invoices
  if (status === "cancelled") return false;

  // Cannot record payments if already fully paid
  if (paymentStatus === "fully_paid") return false;

  return true;
}

/**
 * Validate status transition for invoices/bills
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @param paymentStatus - The payment status
 * @param paidAmount - The amount already paid
 * @throws Error if the transition is invalid
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  paymentStatus: string,
  paidAmount: number,
): void {
  // Cannot change status from paid or cancelled
  if (
    (currentStatus === "paid" || currentStatus === "cancelled") &&
    newStatus !== currentStatus
  ) {
    throw new Error(
      `Cannot change status from ${currentStatus} to ${newStatus}`,
    );
  }

  // Cannot mark as paid if not fully paid
  if (newStatus === "paid" && paymentStatus !== "fully_paid") {
    throw new Error(
      "Cannot mark as paid: invoice/bill is not fully paid",
    );
  }

  // Cannot cancel if payments have been recorded
  if (newStatus === "cancelled" && paidAmount > 0) {
    throw new Error(
      "Cannot cancel: payments have already been recorded",
    );
  }
}
