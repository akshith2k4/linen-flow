import type { WorkflowHandler } from "./types";
import { updateHotelHandler } from "./update_hotel";
import { hotelOnboardingHandler } from "./hotel_onboarding";
import { updateAgreementHandler } from "./update_agreement";
import { generateAgreementHandler } from "./generate_agreement";
import { createOrderHandler } from "./create_order";
import { updateOrderHandler } from "./update_order";
import { createInventoryReservationHandler } from "./create_inventory_reservation";
import { createRouteHandler } from "./create_route";
import { assignRoutePointsHandler } from "./assign_route_points";
import { createWashRequestHandler } from "./create_wash_request";
import { createTripHandler } from "./create_trip";

export type { WorkflowHandler };

export const WORKFLOW_HANDLERS: Record<string, WorkflowHandler> = {
  hotel_onboarding:              hotelOnboardingHandler,
  update_hotel:                  updateHotelHandler,
  generate_agreement:            generateAgreementHandler,
  update_agreement:              updateAgreementHandler,
  create_inventory_reservation:  createInventoryReservationHandler,
  create_order:                  createOrderHandler,
  update_order:                  updateOrderHandler,
  create_route:                  createRouteHandler,
  assign_route_points:           assignRoutePointsHandler,
  create_wash_request:           createWashRequestHandler,
  create_trip:                   createTripHandler,
};
