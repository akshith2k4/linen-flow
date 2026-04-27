"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, FileText, Truck } from "lucide-react";
import { getStatusColor, getOrderTypeColor } from "@/lib/status-colors";
import { formatDate } from "@/lib/format-date";
import { WidgetLayout, DefaultEmptyState } from "@/components/shared/widget-layout";

interface OrderDetailsWidgetProps {
  data: any;
}

export function OrderDetailsWidget({ data }: OrderDetailsWidgetProps) {
  const order = data.order;
  
  if (!order) {
    return (
      <WidgetLayout
        title="Order Details"
        icon={Package}
        isEmpty={true}
        emptyState={<DefaultEmptyState message="No order data available" />}
      >
        <></>
      </WidgetLayout>
    );
  }

  return (
    <WidgetLayout
      title={`Order #${order.referenceNumber || order.id}`}
      icon={Package}
      iconSize={20}
      badges={[
        { 
          label: order.status,
          variant: "default",
          className: getStatusColor(order.status)
        },
        { 
          label: order.orderType,
          variant: "default",
          className: getOrderTypeColor(order.orderType)
        }
      ]}
      headerClassName="py-4 px-5"
      contentClassName="p-5"
    >
      <div className="space-y-4">
        {/* Order ID */}
        <p className="text-xs text-text-muted">
          Order ID: {order.id}
        </p>
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem 
            icon={User} 
            label="Customer" 
            value={order.customerName || `ID: ${order.customerId}`} 
          />
          <InfoItem 
            icon={Calendar} 
            label="Order Date" 
            value={formatDate(order.orderDate)} 
          />
          {order.notes && (
            <InfoItem 
              icon={FileText} 
              label="Notes" 
              value={order.notes} 
              className="md:col-span-2" 
            />
          )}
        </div>

        {/* Order Details Based on Type */}
        {order.leasingOrderDetails && (
          <LeasingOrderDetails details={order.leasingOrderDetails} />
        )}
        {order.rentalOrderDetails && (
          <RentalOrderDetails details={order.rentalOrderDetails} />
        )}
        {order.washingOrderDetails && (
          <WashingOrderDetails details={order.washingOrderDetails} />
        )}
      </div>
    </WidgetLayout>
  );
}

function InfoItem({ icon: Icon, label, value, className = "" }: { 
  icon: any; 
  label: string; 
  value: string; 
  className?: string 
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Icon size={16} className="text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {label}
        </div>
        <div className="text-sm text-text-heading mt-0.5 break-words">
          {value}
        </div>
      </div>
    </div>
  );
}

function LeasingOrderDetails({ details }: { details: any }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="bg-violet-50/50 border-b py-3 px-5">
        <CardTitle className="text-sm font-bold text-text-heading flex items-center gap-2">
          <Truck size={16} className="text-violet-600" />
          Leasing Order Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoItem icon={Calendar} label="Leasing Type" value={details.leasingOrderType} />
          {details.pickupDate && (
            <InfoItem icon={Calendar} label="Pickup Date" value={formatDate(details.pickupDate)} />
          )}
          {details.deliveryDate && (
            <InfoItem icon={Calendar} label="Delivery Date" value={formatDate(details.deliveryDate)} />
          )}
        </div>

        {details.pickupItems && details.pickupItems.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Pickup Items
            </h4>
            <OrderItemsTable items={details.pickupItems} />
          </div>
        )}

        {details.deliveryItems && details.deliveryItems.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Delivery Items
            </h4>
            <OrderItemsTable items={details.deliveryItems} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RentalOrderDetails({ details }: { details: any }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="bg-orange-50/50 border-b py-3 px-5">
        <CardTitle className="text-sm font-bold text-text-heading flex items-center gap-2">
          <Package size={16} className="text-orange-600" />
          Rental Order Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {details.deliveryDate && (
          <InfoItem icon={Calendar} label="Delivery Date" value={formatDate(details.deliveryDate)} />
        )}

        {details.items && details.items.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Rental Items
            </h4>
            <OrderItemsTable items={details.items} showRentalDuration />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WashingOrderDetails({ details }: { details: any }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="bg-cyan-50/50 border-b py-3 px-5">
        <CardTitle className="text-sm font-bold text-text-heading flex items-center gap-2">
          <Package size={16} className="text-cyan-600" />
          Washing Order Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {details.pickupDate && (
            <InfoItem icon={Calendar} label="Pickup Date" value={formatDate(details.pickupDate)} />
          )}
          {details.deliveryDate && (
            <InfoItem icon={Calendar} label="Delivery Date" value={formatDate(details.deliveryDate)} />
          )}
        </div>

        {details.items && details.items.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Washing Items
            </h4>
            <OrderItemsTable items={details.items} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderItemsTable({ items, showRentalDuration = false }: { 
  items: any[]; 
  showRentalDuration?: boolean 
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
              Product
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
              Category
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
              Qty
            </th>
            {showRentalDuration && (
              <th className="px-3 py-2 text-right text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                Duration
              </th>
            )}
            {items.some(i => i.remarks) && (
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                Remarks
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr 
              key={idx} 
              className={`border-b border-border last:border-0 ${
                idx % 2 === 0 ? "bg-white" : "bg-surface/30"
              }`}
            >
              <td className="px-3 py-2 text-text-body font-medium">
                {item.productName}
              </td>
              <td className="px-3 py-2 text-text-muted text-xs">
                {item.productCategory || "-"}
              </td>
              <td className="px-3 py-2 text-right text-text-body font-semibold">
                {item.quantity}
              </td>
              {showRentalDuration && (
                <td className="px-3 py-2 text-right text-text-muted text-xs">
                  {item.rentalDuration ? `${item.rentalDuration} days` : "-"}
                </td>
              )}
              {items.some(i => i.remarks) && (
                <td className="px-3 py-2 text-text-muted text-xs">
                  {item.remarks || "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
