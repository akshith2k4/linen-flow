import type { WorkflowHandler, Filterable } from "./types";
import { toISODateTime, normaliseOrderItem } from "./shared";

export const updateOrderHandler: WorkflowHandler & Filterable = {
  buildPayload(accData) {
    const cur = accData.current_order_data || {};
    const det = cur.leasingOrderDetails || {};

    return {
      ...cur,
      leasingOrderDetails: {
        ...det,
        pickupDate:       toISODateTime(accData.pickupDate       ?? det.pickupDate),
        deliveryDate:     toISODateTime(accData.deliveryDate     ?? det.deliveryDate),
        leasingOrderType: accData.leasingOrderType ?? det.leasingOrderType,
        deliveryItems:    accData.deliveryItems    ?? det.deliveryItems,
      },
    };
  },

  filterItems(key: string, value: any) {
    if (["items", "pickupItems", "deliveryItems"].includes(key) && Array.isArray(value)) {
      return value.map(normaliseOrderItem);
    }
    if (["leasingOrderDetails", "rentalOrderDetails", "washingOrderDetails"].includes(key) && typeof value === "object" && value) {
      const details = { ...value };
      for (const ik of ["pickupItems", "deliveryItems", "items"]) {
        if (Array.isArray(details[ik])) details[ik] = details[ik].map(normaliseOrderItem);
      }
      return details;
    }
    return undefined;
  },

  handleResponse(result: any) {
    return { sharedIds: result.id ? { order_id: result.id } : {} };
  },
};
