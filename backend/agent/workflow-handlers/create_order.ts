import { z } from "zod";
import type { WorkflowHandler, Validatable, Filterable } from "./types";
import { toISODateTime, normaliseOrderItem, safeNum } from "./shared";

export const createOrderHandler: WorkflowHandler & Validatable & Filterable = {
  buildPayload(accData) {
    const isLeasing = accData.orderType === "LEASING";
    const leasingType = accData.leasingOrderType;

    return {
      customerId: accData.customerId,
      orderType: accData.orderType,
      orderDate: toISODateTime(accData.orderDate),
      status: accData.status ?? "PENDING",
      notes: accData.notes ?? "",
      referenceNumber: accData.referenceNumber,
      isAdjustment: accData.isAdjustment ?? false,
      invoiced: accData.invoiced ?? false,
      branchId: accData.branchId,
      orderReferenceId: accData.orderReferenceId,
      leasingOrderDetails: isLeasing ? {
        leasingOrderType: leasingType,
        pickupDate: toISODateTime(accData.pickupDate),
        deliveryDate: toISODateTime(accData.deliveryDate),
        pickupItems: (leasingType === "PICKUP" || leasingType === "BOTH") ? accData.items : [],
        deliveryItems: (leasingType === "DELIVERY" || leasingType === "BOTH") ? accData.items : [],
        orderFulfillment: null,
        pickupFulfillment: null,
        rejectionRequests: [],
      } : null,
    };
  },

  validatePayload(payload: any) {
    const schema = z.object({
      customerId: safeNum,
      status: z.string().default("PENDING"),
      notes: z.string().default(""),
      isAdjustment: z.boolean().default(false),
      invoiced: z.boolean().default(false),
    }).catchall(z.any());
    const r = schema.safeParse(payload);
    if (!r.success) return { success: false, errors: r.error.issues.map(e => `${e.path.join(".")}: ${e.message}`) };
    return { success: true, data: r.data };
  },

  filterItems(key: string, value: any) {
    if (["items", "pickupItems", "deliveryItems"].includes(key) && Array.isArray(value)) {
      return value.map(normaliseOrderItem);
    }
    return undefined;
  },

  handleResponse(result: any) {
    return { sharedIds: result.id ? { order_id: result.id } : {} };
  },
};
