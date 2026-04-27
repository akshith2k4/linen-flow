import type { WorkflowHandler } from "./types";
import { buildAddress } from "./shared";

export const updateHotelHandler: WorkflowHandler = {
  buildPayload(accData) {
    const cur = accData.current_customer_data || {};
    const billing  = buildAddress(accData, "billingAddress");
    const shipping = buildAddress(accData, "shippingAddress");

    return {
      ...cur,
      name:    accData.name    ?? cur.name,
      code:    accData.code    ?? cur.code,
      email:   accData.email   ?? cur.email,
      phone:   accData.phone   ?? cur.phone,
      type:    accData.type    ?? cur.type,
      status:  accData.status  ?? cur.status,
      gstin:   accData.gstin   ?? cur.gstin,
    pan:     accData.pan     ?? cur.pan,
      billingAddress:  Object.values(billing).some(v => v != null)  ? billing  : cur.billingAddress,
      shippingAddress: Object.values(shipping).some(v => v != null) ? shipping : cur.shippingAddress,
      contactPersons:  accData.contactPersons ?? cur.contactPersons ?? [],
    };
  },

  handleResponse(result) {
    return { sharedIds: result.id ? { customer_id: result.id } : {} };
  },
};
