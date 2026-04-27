import { z } from "zod";
import type { WorkflowHandler, Validatable, Filterable } from "./types";
import { safeNum, normaliseReservationItem } from "./shared";

export const createInventoryReservationHandler: WorkflowHandler & Validatable & Filterable = {
  buildPayload(accData) {
    // reservationType comes from Step 3 field "reservationType"
    // Fall back to accData.type only if it looks like a reservation type (not customer type)
    const reservationTypes = ["FIXED", "ROTATIONAL"];
    const reservationType = accData.reservationType || 
      (reservationTypes.includes(accData.type) ? accData.type : undefined);

    return {
      poolId: accData.poolId,
      reservationType,
      status: accData.status || "ACTIVE",
      reservationDate: accData.reservationDate,
      startDate: accData.startDate,
      endDate: accData.endDate,
      checkFrequency: accData.checkFrequency,
      notes: accData.notes || "",
      items: Array.isArray(accData.items) ? accData.items.map(normaliseReservationItem) : [],
    };
  },

  filterItems(key, value) {
    if (key === "items" && Array.isArray(value)) {
      return value.map(normaliseReservationItem);
    }
    return undefined;
  },

  validatePayload(payload: any) {
    const schema = z.object({
      poolId: safeNum,
      reservationType: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }).passthrough();
    const r = schema.safeParse(payload);
    if (!r.success) return { success: false, errors: r.error.issues.map(e => `${e.path.join(".")}: ${e.message}`) };
    return { success: true, data: r.data };
  },

  handleResponse(result: any) {
    return { sharedIds: result.id ? { reservation_id: result.id } : {} };
  },
};
