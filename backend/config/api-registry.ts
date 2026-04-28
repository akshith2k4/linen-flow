const BASE_URL = "https://apidev.linengrass.com";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "x-company-id": "1"
} as const;

export type ApiId =
  | "CREATE_CUSTOMER"
  | "GET_CUSTOMER"
  | "UPDATE_CUSTOMER"
  | "CREATE_AGREEMENT"
  | "GET_AGREEMENT"
  | "UPDATE_AGREEMENT"
  | "CREATE_RESERVATION"
  | "GET_POOLS"
  | "CREATE_ORDER"
  | "GET_ORDER"
  | "UPDATE_ORDER"
  | "GET_RESERVED_PRODUCTS"
  | "CREATE_ROUTE"
  | "GET_ROUTE"
  | "ASSIGN_ROUTE_POINTS"
  | "GET_CUSTOMERS"
  | "GET_VENDORS"
  | "GET_DCS"
  | "CREATE_WASH_REQUEST"
  | "CREATE_TRIP";

export interface ApiContract {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  store_as?: string;
  payload_mapping?: Record<string, string>;
  merge_with_current?: boolean;
  transform?: {
    map_to_options?: boolean;
    value_key?: string;
    label_key?: string;
    include_fields?: string[];
  };
}

export const API_REGISTRY: Record<ApiId, ApiContract> = {
  CREATE_CUSTOMER: {
    endpoint: `${BASE_URL}/api/customers`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_CUSTOMER: {
    endpoint: `${BASE_URL}/api/customers/{{accumulated_data.customer_id}}`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "current_customer_data"
  },
  UPDATE_CUSTOMER: {
    endpoint: `${BASE_URL}/api/customers/{{accumulated_data.customer_id}}`,
    method: "PUT",
    headers: { ...COMMON_HEADERS }
  },
  CREATE_AGREEMENT: {
    endpoint: `${BASE_URL}/api/agreements`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_AGREEMENT: {
    endpoint: `${BASE_URL}/api/agreements/customer/{{accumulated_data.customer_id}}`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "current_agreement_data"
  },
  UPDATE_AGREEMENT: {
    endpoint: `${BASE_URL}/api/agreements/{{accumulated_data.agreement_id || accumulated_data.current_agreement_data.id}}`,
    method: "PUT",
    headers: { ...COMMON_HEADERS }
  },
  CREATE_RESERVATION: {
    endpoint: `${BASE_URL}/api/inventory/customers/{{accumulated_data.customer_id}}/reservations`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_POOLS: {
    endpoint: `${BASE_URL}/api/inventory/pools`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "selected_pool_data"
  },
  CREATE_ORDER: {
    endpoint: `${BASE_URL}/api/orders`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_ORDER: {
    endpoint: `${BASE_URL}/api/orders/{{accumulated_data.order_id}}`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "current_order_data"
  },
  UPDATE_ORDER: {
    endpoint: `${BASE_URL}/api/orders/{{accumulated_data.order_id || accumulated_data.current_order_data.id}}`,
    method: "PUT",
    headers: { ...COMMON_HEADERS }
  },
  GET_RESERVED_PRODUCTS: {
    endpoint: `${BASE_URL}/api/inventory/customers/{{accumulated_data.customerId}}/reserved-products`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "available_products",
    transform: {
      map_to_options: true,
      value_key: "id",
      label_key: "name",
      include_fields: ["id", "name", "code", "category", "price"]
    }
  },
  CREATE_ROUTE: {
    endpoint: `${BASE_URL}/api/trips/routes`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_ROUTE: {
    endpoint: `${BASE_URL}/api/trips/routes/{{accumulated_data.route_id}}`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "current_route_data"
  },
  ASSIGN_ROUTE_POINTS: {
    endpoint: `${BASE_URL}/api/trips/routes/{{accumulated_data.route_id}}/assign-points`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  GET_CUSTOMERS: {
    endpoint: `${BASE_URL}/api/customers?page=0&size=200`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "available_customers"
  },
  GET_VENDORS: {
    endpoint: `${BASE_URL}/api/laundry-vendors`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "available_vendors"
  },
  GET_DCS: {
    endpoint: `${BASE_URL}/api/distribution-centers`,
    method: "GET",
    headers: { ...COMMON_HEADERS },
    store_as: "available_dcs"
  },
  CREATE_WASH_REQUEST: {
    endpoint: `${BASE_URL}/api/soiled-inventory/wash-requests`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  },
  CREATE_TRIP: {
    endpoint: `${BASE_URL}/api/trips/create-from-route`,
    method: "POST",
    headers: { ...COMMON_HEADERS }
  }
};
