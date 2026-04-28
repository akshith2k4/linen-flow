import { z } from "zod";
import type { AddressEntity } from "../entity-types";

/**
 * Zod schema for safely parsing numeric values that may arrive as strings.
 * Transforms string numbers to actual numbers, fails on invalid values.
 */
export const safeNum = z.union([
  z.number(),
  z.string().transform((val, ctx) => {
    const n = Number(val);
    if (isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Cannot convert "${val}" to number` });
      return z.NEVER;
    }
    return n;
  })
]).optional();

export function buildAddress(data: any, prefix: string): AddressEntity {
  const nested = data[prefix] && typeof data[prefix] === "object" ? data[prefix] : {};
  const flat = (f: string) => data[`${prefix}.${f}`];
  return {
    addressLine1: nested.addressLine1 ?? flat("addressLine1"),
    addressLine2: nested.addressLine2 ?? flat("addressLine2"),
    city: nested.city ?? flat("city"),
    state: nested.state ?? flat("state"),
    country: nested.country ?? flat("country"),
    pincode: nested.pincode ?? flat("pincode"),
  };
}

export function toISODateTime(val: any): any {
  if (typeof val !== "string") return val;
  
  // Already full ISO with seconds: "2026-04-27T10:00:00" or "2026-04-27T10:00:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return val;
  
  // Date only: "2026-04-27" → append midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return `${val}T00:00:00.000Z`;
  
  // datetime-local from HTML input: "2026-04-27T23:32" → append ":00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  
  return val;
}

function toInt(v: any): number | null {
  if (v == null) return null;
  return typeof v === "string" ? parseInt(v, 10) : v;
}

export function normaliseOrderItem(item: any): any {
  return {
    productId: toInt(item.productId),
    productName: item.productName || "",
    productCategory: item.productCategory || "",
    quantity: toInt(item.quantity),
    actualQuantity: item.actualQuantity != null ? toInt(item.actualQuantity) : 0,
    rejectedQuantity: item.rejectedQuantity != null ? toInt(item.rejectedQuantity) : null,
    heavySoiledQuantity: item.heavySoiledQuantity != null ? toInt(item.heavySoiledQuantity) : null,
    damagedQuantity: item.damagedQuantity != null ? toInt(item.damagedQuantity) : null,
    remarks: item.remarks || "",
    rentalDuration: item.rentalDuration != null ? toInt(item.rentalDuration) : null,
    unitPrice: typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : (item.unitPrice ?? 0),
  };
}

export function normaliseReservationItem(item: any): any {
  return {
    productId: toInt(item.productId),
    type: item.type || "FIXED",
    totalReservedQuantity: toInt(item.totalReservedQuantity) ?? 0,
    quantityAllocatedWithCustomer: toInt(item.quantityAllocatedWithCustomer) ?? 0,
    quantityAllocatedWithDC: toInt(item.quantityAllocatedWithDC) ?? 0,
    remarks: item.remarks || "",
  };
}
