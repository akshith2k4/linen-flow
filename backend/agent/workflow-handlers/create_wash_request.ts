import { z } from "zod";
import type { WorkflowHandler, Validatable } from "./types";
import { safeNum, toISODateTime } from "./shared";

export const createWashRequestHandler: WorkflowHandler & Validatable = {
  buildPayload(accData) {
    const rawItems = accData.productSoiledItems || [];
    
    const productSoiledItems = rawItems.map((item: any) => {
      const soiledQty = item.soiledQuantity != null ? Number(item.soiledQuantity) : 0;
      let heavySoiledQty = item.heavySoiledQuantity != null ? Number(item.heavySoiledQuantity) : 0;
      
      // Clamp: heavy soiled cannot exceed total soiled
      if (heavySoiledQty > soiledQty) {
        console.warn(
          `⚠️ heavySoiledQuantity (${heavySoiledQty}) > soiledQuantity (${soiledQty}), clamping to ${soiledQty}`
        );
        heavySoiledQty = soiledQty;
      }
      
      return {
        productId: item.productId != null ? Number(item.productId) : undefined,
        soiledQuantity: soiledQty,
        washedQuantity: 0,
        heavySoiledQuantity: heavySoiledQty,
      };
    });

    // Build payload, only include optional fields if they have values
    const payload: any = {
      referenceId: accData.poolId ? Number(accData.poolId) : undefined,
      referenceType: "INVENTORY_POOL",
      laundryVendorId: accData.laundryVendorId ? Number(accData.laundryVendorId) : undefined,
      dcId: accData.dcId ? Number(accData.dcId) : undefined,
      washRequestType: accData.washRequestType || "WASH",
      productSoiledItems,
    };

    // Only include optional fields if they have actual values (not empty strings)
    if (accData.plannedWashTime) {
      payload.plannedWashTime = toISODateTime(accData.plannedWashTime);
    }
    
    if (accData.washRequestRecordedDateTime) {
      payload.washRequestRecordedDateTime = toISODateTime(accData.washRequestRecordedDateTime);
    }
    
    if (accData.notes && accData.notes.trim() !== "") {
      payload.notes = accData.notes;
    }

    return payload;
  },

  validatePayload(payload: any) {
    const schema = z.object({
      laundryVendorId: safeNum,
      dcId: safeNum,
      referenceId: safeNum,
      referenceType: z.string(),
      washRequestType: z.string().default("WASH"),
      productSoiledItems: z.array(
        z.object({
          productId: safeNum,
          soiledQuantity: z.number().default(0),
          washedQuantity: z.number().default(0),
          heavySoiledQuantity: z.number().default(0),
        })
      ).default([]),
    }).passthrough();

    const r = schema.safeParse(payload);
    if (!r.success) {
      return {
        success: false,
        errors: r.error.issues.map(e => `${e.path.join(".")}: ${e.message}`),
      };
    }
    return { success: true, data: r.data };
  },

  handleResponse(result: any) {
    return { sharedIds: result.id ? { wash_request_id: result.id } : {} };
  },
};
