import hotel_onboarding from "./hotel_onboarding.json";
import update_hotel from "./update_hotel.json";
import generate_agreement from "./generate_agreement.json";
import update_agreement from "./update_agreement.json";
import create_inventory_reservation from "./create_inventory_reservation.json";
import create_order from "./create_order.json";
import update_order from "./update_order.json";
import assign_route_points from "./assign_route_points.json";
import create_route from "./create_route.json";
import create_wash_request from "./create_wash_request.json";
import create_trip from "./create_trip.json";

const workflows = {
  hotel_onboarding,
  update_hotel,
  generate_agreement,
  update_agreement,
  create_inventory_reservation,
  create_order,
  update_order,
  assign_route_points,
  create_route,
  create_wash_request,
  create_trip,
};

export default workflows;
export type WorkflowKey = keyof typeof workflows;
