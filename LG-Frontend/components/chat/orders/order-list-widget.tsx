"use client";

import { Package, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getOrderTypeColor } from "@/lib/status-colors";
import { formatDate } from "@/lib/format-date";
import { SimpleFormattedText } from "@/components/shared/simple-formatted-text";
import { exportToExcel } from "@/lib/excel-export";
import { WidgetLayout, DefaultEmptyState } from "@/components/shared/widget-layout";

interface OrderListWidgetProps {
  data: any;
}

export function OrderListWidget({ data }: OrderListWidgetProps) {
  const { title, total_count, orders, preamble, postamble } = data;
  
  const downloadExcel = () => {
    if (!orders || orders.length === 0) return;
    
    exportToExcel(
      orders,
      [
        { key: 'id', label: 'Order ID' },
        { key: 'referenceNumber', label: 'Reference Number' },
        { key: 'customerName', label: 'Customer Name' },
        { key: 'customerId', label: 'Customer ID' },
        { key: 'status', label: 'Status' },
        { key: 'orderType', label: 'Order Type' },
        { key: 'orderDate', label: 'Order Date' },
        { key: 'notes', label: 'Notes' }
      ],
      'orders'
    );
  };
  
  const handleSearchOrders = () => {
    const event = new CustomEvent('sendChatMessage', { 
      detail: { message: 'I want to search for orders' }
    });
    window.dispatchEvent(event);
  };
  
  return (
    <WidgetLayout
      title={title || "Orders List"}
      icon={Package}
      badges={total_count !== undefined ? [
        { 
          label: `${total_count} Total`,
          className: "bg-primary/10 text-primary border-primary/20"
        }
      ] : []}
      actions={orders && orders.length > 0 ? [
        {
          label: "Export Excel",
          icon: Download,
          onClick: downloadExcel,
          variant: "outline",
          className: "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        }
      ] : []}
      isEmpty={!orders || orders.length === 0}
      emptyState={
        <DefaultEmptyState
          message="No orders found."
          actionLabel="Search for orders"
          onAction={handleSearchOrders}
        />
      }
      preamble={preamble && <SimpleFormattedText text={preamble} />}
      postamble={postamble && <SimpleFormattedText text={postamble} />}
    >
      <div className="divide-y divide-border/40">
        {orders?.map((order: any, idx: number) => (
          <div
            key={`${order.id}-${idx}`}
            className="p-4 hover:bg-surface/30 transition-colors animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-both"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <div className="font-semibold text-text-heading">
                    {order.referenceNumber || `Order #${order.id}`}
                  </div>
                  <Badge className={`text-[9px] font-bold px-2 py-0.5 ${getStatusColor(order.status)}`}>
                    {order.status}
                  </Badge>
                  <Badge className={`text-[9px] font-bold px-2 py-0.5 ${getOrderTypeColor(order.orderType)}`}>
                    {order.orderType}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  <span className="font-medium">{order.customerName || `Customer ID: ${order.customerId}`}</span>
                  <span>•</span>
                  <span>{formatDate(order.orderDate, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                
                {order.notes && (
                  <div className="text-[11px] text-text-muted mt-1.5 line-clamp-1">
                    {order.notes}
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <div className="text-[10px] font-mono text-text-muted bg-surface/50 px-2 py-0.5 rounded border border-border">
                  ID: {order.id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetLayout>
  );
}
