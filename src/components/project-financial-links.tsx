import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getProjectFinancialCountsFn } from "@/server/financial-summary";
import {
  IconShoppingCart,
  IconReceipt,
  IconFileInvoice,
  IconFileText,
  IconCash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

interface ProjectFinancialLinksProps {
  projectId: string;
}

export function ProjectFinancialLinks({
  projectId,
}: ProjectFinancialLinksProps) {
  const { data: financialCounts, isLoading } = useQuery({
    queryKey: ["project-financial-counts", projectId],
    queryFn: () => getProjectFinancialCountsFn({ data: { projectId } }),
    staleTime: 5 * 60 * 1000,
  });

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
    },
    {
      title: "Purchase Orders",
      icon: IconReceipt,
      count: financialCounts.purchaseOrders.count,
      total: financialCounts.purchaseOrders.total,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Customer Invoices",
      icon: IconFileInvoice,
      count: financialCounts.customerInvoices.count,
      total: financialCounts.customerInvoices.total,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Vendor Bills",
      icon: IconFileText,
      count: financialCounts.vendorBills.count,
      total: financialCounts.vendorBills.total,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      title: "Expenses",
      icon: IconCash,
      count: financialCounts.expenses.count,
      total: financialCounts.expenses.total,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
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
            return (
              <div
                key={doc.title}
                className={`flex items-center justify-between p-4 rounded-lg border ${doc.borderColor} ${doc.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${doc.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
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
                  {doc.count > 0 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      View
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
