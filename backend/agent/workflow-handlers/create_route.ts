import type { WorkflowHandler } from "./types";

export const createRouteHandler: WorkflowHandler = {
  buildPayload(accData) {
    return {
      name: accData.name,
      dcId: accData.dcId,
    };
  },

  handleResponse(result) {
    return { sharedIds: result.id ? { route_id: result.id } : {} };
  },
};
