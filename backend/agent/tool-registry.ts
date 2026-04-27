/**
 * Tool Registry
 *
 * Single responsibility: tool routing and parameter contracts.
 * - TOOL_MAP: tool name → executable tool function
 * - REQUIRED_PARAMS: which params must be present before calling a tool
 * - COLLECTION_WIDGETS: what widget to show when required params are missing
 * - PARAM_MAPPING: form submission key → tool param name
 */
import {
  getHotelById, listHotels, searchHotels,
  getActiveAgreement, getAllActiveAgreements, getAllAgreements, getAgreementProducts,
  getInventoryPoolById, listInventoryPools,
  getReservationById, getReservationsByCustomer, listReservations,
  getOrderById, listOrders, searchOrders, getOrdersByCustomer,
  getIncompleteOrdersByCustomer, getPickupFulfillmentForOrder,
  getProductById, listProducts, searchProducts,
  listRoutes, getRouteById, listVendors,
} from "./tools";

// ── Tool execution map ────────────────────────────────────────────────────────
export const TOOL_MAP: Record<string, any> = {
  get_hotel_by_id: getHotelById,
  list_hotels: listHotels,
  search_hotels: searchHotels,
  get_active_agreement: getActiveAgreement,
  get_all_active_agreements: getAllActiveAgreements,
  get_all_agreements_history: getAllAgreements,
  get_agreement_products: getAgreementProducts,
  get_inventory_pool_by_id: getInventoryPoolById,
  list_inventory_pools: listInventoryPools,
  get_reservation_by_id: getReservationById,
  get_reservations_by_customer: getReservationsByCustomer,
  list_reservations: listReservations,
  get_order_by_id: getOrderById,
  list_orders: listOrders,
  search_orders: searchOrders,
  get_orders_by_customer: getOrdersByCustomer,
  get_incomplete_orders_by_customer: getIncompleteOrdersByCustomer,
  get_pickup_fulfillment_for_order: getPickupFulfillmentForOrder,
  get_product_by_id: getProductById,
  list_products: listProducts,
  search_products: searchProducts,
  list_routes: listRoutes,
  get_route_by_id: getRouteById,
  list_vendors: listVendors,
};

// ── Required params (code enforces, not LLM) ─────────────────────────────────
const REQUIRED_PARAMS: Record<string, string[]> = {
  get_hotel_by_id: ["id"],
  get_active_agreement: ["customerId"],
  get_all_active_agreements: ["customerId"],
  get_all_agreements_history: ["customerId"],
  get_agreement_products: ["customerId"],
  get_inventory_pool_by_id: ["id"],
  get_reservation_by_id: ["id"],
  get_reservations_by_customer: ["customerId"],
  get_order_by_id: ["id"],
  get_orders_by_customer: ["customerId"],
  get_incomplete_orders_by_customer: ["customerId"],
  get_pickup_fulfillment_for_order: ["orderId"],
  get_product_by_id: ["id"],
  list_hotels: [],
  list_inventory_pools: [],
  list_reservations: [],
  list_orders: [],
  search_hotels: [],
  search_orders: [],
  search_products: [],
  list_products: [],
  list_routes: [],
  list_vendors: [],
};

// ── Collection widget shown when required params are missing ──────────────────
const COLLECTION_WIDGETS: Record<string, any> = {
  list_orders: { ui_widget: "hotel_order_search", data: { title: "Find Hotel to View Orders", description: "Search and select a hotel to view its orders." } },
  get_orders_by_customer: { ui_widget: "hotel_order_search", data: { title: "Find Hotel to View Orders", description: "Search and select a hotel to view its orders." } },
  get_incomplete_orders_by_customer: { ui_widget: "hotel_order_search", data: { title: "Find Hotel", description: "Search and select a hotel." } },
  get_active_agreement: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
  get_all_active_agreements: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
  get_all_agreements_history: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
  get_agreement_products: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
  get_hotel_by_id: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
  get_reservations_by_customer: { ui_widget: "search_form", data: { title: "Find Hotel", search_type: "hotel", api_source: "/api/customers/search", placeholder: "Type hotel name..." } },
};

// ── Param mapping: form submission key → tool param name ─────────────────────
const PARAM_MAPPING: Record<string, Record<string, string>> = {
  list_orders: { customer_id: "customerId" },
  get_orders_by_customer: { customer_id: "customerId" },
  get_incomplete_orders_by_customer: { customer_id: "customerId" },
  get_active_agreement: { customer_id: "customerId" },
  get_all_active_agreements: { customer_id: "customerId" },
  get_all_agreements_history: { customer_id: "customerId" },
  get_agreement_products: { customer_id: "customerId" },
  get_hotel_by_id: { customer_id: "id" },
  get_reservations_by_customer: { customer_id: "customerId" },
};

// ── Public API ────────────────────────────────────────────────────────────────
export function getMissingParams(toolName: string, args: Record<string, any>): string[] {
  return (REQUIRED_PARAMS[toolName] || []).filter(p => args[p] == null);
}

export function getCollectionWidget(toolName: string): any | null {
  return COLLECTION_WIDGETS[toolName] || null;
}

export function remapCollectedParams(toolName: string, userDataParams: Record<string, any>): Record<string, any> {
  const mapping = PARAM_MAPPING[toolName] || {};
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(userDataParams)) {
    result[mapping[key] || key] = val;
  }
  return result;
}
