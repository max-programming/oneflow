import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { getProjectFinancialCountsFn } from "@/server/financial-summary";
import { getProjectSalesOrdersFn } from "@/server/sales-orders";
import { getProjectPurchaseOrdersFn } from "@/server/purchase-orders";
import { getProjectCustomerInvoicesFn } from "@/server/customer-invoices";
import { getProjectVendorBillsFn } from "@/server/vendor-bills";
import { getProjectExpensesFn } from "@/server/expenses";
import {
  IconShoppingCart,
  IconReceipt,
  IconFileInvoice,
  IconFileText,
  IconCash,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";

interface ProjectFinancialLinksProps {
  projectId: number;
}

export function ProjectFinancialLinks({
  projectId,
}: ProjectFinancialLinksProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(),
  );

  const { data: financialCounts, isLoading } = useQuery({
    queryKey: ["project-financial-counts", projectId],
    queryFn: () => getProjectFinancialCountsFn({ data: { projectId } }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch detailed data for each section
  const { data: salesOrders } = useQuery({
    queryKey: ["project-sales-orders", projectId],
    queryFn: () => getProjectSalesOrdersFn({ data: { projectId, limit: 5 } }),
    enabled: expandedSections.has("Sales Orders"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["project-purchase-orders", projectId],
    queryFn: () =>
      getProjectPurchaseOrdersFn({ data: { projectId, limit: 5 } }),
    enabled: expandedSections.has("Purchase Orders"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customerInvoices } = useQuery({
    queryKey: ["project-customer-invoices", projectId],
    queryFn: () =>
      getProjectCustomerInvoicesFn({ data: { projectId, limit: 5 } }),
    enabled: expandedSections.has("Customer Invoices"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendorBills } = useQuery({
    queryKey: ["project-vendor-bills", projectId],
    queryFn: () => getProjectVendorBillsFn({ data: { projectId, limit: 5 } }),
    enabled: expandedSections.has("Vendor Bills"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses } = useQuery({
    queryKey: ["project-expenses", projectId],
    queryFn: () => getProjectExpensesFn({ data: { projectId } }),
    enabled: expandedSections.has("Expenses"),
    staleTime: 5 * 60 * 1000,
  });

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financialCounts) {
    return null;
  }

  const documents = [
    {
      title: "Sales Orders",
      icon: IconShoppingCart,
      count: financialCounts.salesOrders.count,
      total: financialCounts.salesOrders.total,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      data: salesOrders,
      renderItem: (item: any) => (
        <div key={item.id} className="flex justify-between items-start py-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.orderNumber}</div>
            <div className="text-xs text-muted-foreground">
              {item.customerName} •{" "}
              {new Date(item.orderDate).toLocaleDateString()}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              ₹{parseFloat(item.totalAmount).toLocaleString()}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Purchase Orders",
      icon: IconReceipt,
      count: financialCounts.purchaseOrders.count,
      total: financialCounts.purchaseOrders.total,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      data: purchaseOrders,
      renderItem: (item: any) => (
        <div key={item.id} className="flex justify-between items-start py-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.orderNumber}</div>
            <div className="text-xs text-muted-foreground">
              {item.vendorName} •{" "}
              {new Date(item.orderDate).toLocaleDateString()}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              ₹{parseFloat(item.totalAmount).toLocaleString()}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Customer Invoices",
      icon: IconFileInvoice,
      count: financialCounts.customerInvoices.count,
      total: financialCounts.customerInvoices.total,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      data: customerInvoices,
      renderItem: (item: any) => (
        <div key={item.id} className="flex justify-between items-start py-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.invoiceNumber}</div>
            <div className="text-xs text-muted-foreground">
              {item.customerName} •{" "}
              {new Date(item.invoiceDate).toLocaleDateString()}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              ₹{parseFloat(item.totalAmount).toLocaleString()}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Vendor Bills",
      icon: IconFileText,
      count: financialCounts.vendorBills.count,
      total: financialCounts.vendorBills.total,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      data: vendorBills,
      renderItem: (item: any) => (
        <div key={item.id} className="flex justify-between items-start py-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.billNumber}</div>
            <div className="text-xs text-muted-foreground">
              {item.vendorName} • {new Date(item.billDate).toLocaleDateString()}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              ₹{parseFloat(item.totalAmount).toLocaleString()}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.status}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Expenses",
      icon: IconCash,
      count: financialCounts.expenses.count,
      total: financialCounts.expenses.total,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      data: expenses?.slice(0, 5),
      renderItem: (item: any) => (
        <div key={item.id} className="flex justify-between items-start py-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.expenseNumber}</div>
            <div className="text-xs text-muted-foreground">
              {item.userName} •{" "}
              {new Date(item.expenseDate).toLocaleDateString()}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="font-semibold text-sm">
              ₹{parseFloat(item.amount).toLocaleString()}
            </div>
            <Badge variant="secondary" className="text-xs mt-1">
              {item.approvalStatus}
            </Badge>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => {
            const Icon = doc.icon;
            const isExpanded = expandedSections.has(doc.title);
            const hasDocuments = doc.count > 0;

            return (
              <Collapsible
                key={doc.title}
                open={isExpanded}
                onOpenChange={() => hasDocuments && toggleSection(doc.title)}
              >
                <div
                  className={`rounded-lg border ${doc.borderColor} ${doc.bgColor}`}
                >
                  <CollapsibleTrigger
                    className="w-full"
                    disabled={!hasDocuments}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {hasDocuments && (
                          <div className="text-gray-500">
                            {isExpanded ? (
                              <IconChevronDown className="h-4 w-4" />
                            ) : (
                              <IconChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        <div className={`${doc.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm">{doc.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.count} document{doc.count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          ₹{parseFloat(doc.total).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                      {doc.data && doc.data.length > 0 ? (
                        <div className="space-y-1 divide-y">
                          {doc.data.map((item: any) => doc.renderItem(item))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">
                          Loading recent {doc.title.toLowerCase()}...
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
