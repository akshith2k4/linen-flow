import type { WorkflowHandler } from "./types";

export const createTripHandler: WorkflowHandler = {
  buildPayload(accData) {
    return {
      routeId: accData.routeId ? Number(accData.routeId) : undefined,
      routeName: accData.routeName || "",
      deliveryDate: accData.deliveryDate,
      vehicleId: accData.vehicleId ? Number(accData.vehicleId) : undefined,
      notes: accData.notes ?? "",
      branchId: "1",
      dcId: accData.dcId ? Number(accData.dcId) : undefined,
      tripType: accData.tripType || "ORDER_TRIP",
      assignedPeople: (accData.assignedPeople || []).map((p: any) => ({
        userId: Number(p.userId),
        role: p.role || "DRIVER",
      })),
      visitRequests: accData.visitRequests || [],
    };
  },

  handleResponse(result: any) {
    return { sharedIds: result.id ? { trip_id: result.id } : {} };
  },
};
