import type { WorkflowHandler } from "./types";

export const assignRoutePointsHandler: WorkflowHandler = {
  buildPayload(accData) {
    const selectedStops = accData.selectedStops || {};
    const customers = selectedStops.customers || [];
    const vendors = selectedStops.vendors || [];

    // Build the points array with deduplication
    const pointsMap = new Map<number, { partyId: number; partyType: string }>();

    // Add customers
    customers.forEach((customerId: number) => {
      pointsMap.set(customerId, {
        partyId: customerId,
        partyType: "CUSTOMER",
      });
    });

    // Add vendors
    vendors.forEach((vendorId: number) => {
      pointsMap.set(vendorId, {
        partyId: vendorId,
        partyType: "LAUNDRY_VENDOR",
      });
    });

    const points = Array.from(pointsMap.values());

    return {
      routeId: accData.route_id,
      points,
    };
  },

  handleResponse(result) {
    return { sharedIds: {} };
  },
};
