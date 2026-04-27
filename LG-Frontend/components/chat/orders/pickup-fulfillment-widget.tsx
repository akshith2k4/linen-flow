"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, CheckCircle2, Tag } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { WidgetLayout, DefaultEmptyState } from "@/components/shared/widget-layout";

interface PickupFulfillmentWidgetProps {
  data: any;
}

export function PickupFulfillmentWidget({ data }: PickupFulfillmentWidgetProps) {
  const fulfillment = data.fulfillment;
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };
  
  if (!fulfillment) {
    return (
      <WidgetLayout
        title="Pickup Fulfillment"
        icon={Package}
        isEmpty={true}
        emptyState={<DefaultEmptyState message="No fulfillment data available" />}
      >
        <></>
      </WidgetLayout>
    );
  }

  return (
    <WidgetLayout
      title="Pickup Fulfillment"
      icon={Package}
      iconSize={20}
      badges={[
        { 
          label: fulfillment.status,
          variant: "default",
          className: getStatusColor(fulfillment.status)
        }
      ]}
      headerClassName="bg-purple-50/50 py-4 px-5"
      contentClassName="p-5"
    >
      <div className="space-y-4">
        {/* IDs */}
        <p className="text-xs text-text-muted">
          Order ID: {fulfillment.orderId} • Fulfillment ID: {fulfillment.id}
        </p>
        
        {/* Pickup Date */}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-primary flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Pickup Date
            </div>
            <div className="text-sm text-text-heading mt-0.5">
              {formatDate(fulfillment.pickupDate)}
            </div>
          </div>
        </div>

        {/* Items Card */}
        {fulfillment.items && fulfillment.items.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-surface/40 border-b py-3 px-5">
              <CardTitle className="text-sm font-bold text-text-heading flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                Picked Up Items ({fulfillment.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                        Product
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                        Code
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                        RFID
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                        RFID Tag
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                        Inventory ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fulfillment.items.map((item: any, idx: number) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-border last:border-0 ${
                          idx % 2 === 0 ? "bg-white" : "bg-surface/30"
                        } hover:bg-primary/5 transition-colors`}
                      >
                        <td className="px-4 py-3 text-text-body font-medium">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs font-mono">
                          {item.productCode || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.hasRfid ? (
                            <Badge className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-800 border-green-200">
                              <Tag size={10} className="mr-1" />
                              YES
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 border-gray-200">
                              NO
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.rfidTagId ? (
                            <div className="flex items-center gap-2">
                              <Tag size={14} className="text-primary" />
                              <span className="text-xs font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                {item.rfidTagId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-muted text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {item.inventoryItemId || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WidgetLayout>
  );
}
