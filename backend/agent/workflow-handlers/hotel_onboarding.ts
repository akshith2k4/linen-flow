import type { WorkflowHandler } from "./types";
import { buildAddress } from "./shared";

export const hotelOnboardingHandler: WorkflowHandler = {
  buildPayload(accData) {
    return {
      name: accData.name,
      email: accData.email,
      phone: accData.phone,
      type: accData.type,
      gstin: accData.gstin,
      pan: accData.pan,
      dcId: accData.dcId ?? accData.warehouse,
      companyId: accData.companyId ?? 1, // Default to 1 if not provided
      billingAddress: buildAddress(accData, "billingAddress"),
      shippingAddress: buildAddress(accData, "shippingAddress"),
      contactPersons: accData.contactPersons ?? [],
    };
  },

  handleResponse(result) {
    return { sharedIds: result.id ? { customer_id: result.id } : {} };
  },
};
