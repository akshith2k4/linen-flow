
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { apiClient } from '../lib/api-client';



export const getHotelById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/customers/${id}`);
}, {
  name: "get_hotel_by_id",
  description: "Retrieve detailed information for a specific hotel by its ID",
  schema: z.object({
    id: z.number().describe("The unique ID of the hotel/customer"),
  }),
});

export const listHotels = tool(async ({ name, code, dcId, page, size, sortBy, sortDirection }) => {
  return apiClient.fetchAsString('/customers', { 
    name, 
    code, 
    dcId, 
    page, 
    size, 
    sortBy, 
    sortDirection 
  });
}, {
  name: "list_hotels",
  description: "Get a paginated list of hotels. Can filter by name, code, or distribution center.",
  schema: z.object({
    name: z.string().optional().describe("Filter by name (partial match)"),
    code: z.string().optional().describe("Filter by customer code"),
    dcId: z.number().optional().describe("Filter by distribution center ID"),
    page: z.number().default(0).describe("Page number (0-indexed)"),
    size: z.number().default(100).describe("Page size"),
    sortBy: z.string().default('name').describe("Sort field"),
    sortDirection: z.string().default('asc').describe("Sort direction (asc/desc)"),
  }),
});

export const searchHotels = tool(async ({ name }) => {
  return apiClient.fetchAsString('/customers/search', { name });
}, {
  name: "search_hotels",
  description: "Search hotels by name. Returns a simplified list of matches.",
  schema: z.object({
    name: z.string().describe("The search query string"),
  }),
});



export const getActiveAgreement = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/agreements/customer/${customerId}`);
}, {
  name: "get_active_agreement",
  description: "Get the currently active agreement for a specific hotel customer",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const getAllActiveAgreements = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/agreements/customer/${customerId}/active`);
}, {
  name: "get_all_active_agreements",
  description: "Get a list of all active agreements for a specific hotel customer",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const getAllAgreements = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/agreements/customer/${customerId}/all`);
}, {
  name: "get_all_agreements_history",
  description: "Get all agreements (active and inactive) for a specific hotel customer",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const getAgreementProducts = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/agreements/customer/${customerId}/active/products`);
}, {
  name: "get_agreement_products",
  description: "Get the product list and prices for the active agreement of a customer",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});


export const getInventoryPoolById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/inventory/pools/${id}`);
}, {
  name: "get_inventory_pool_by_id",
  description: "Retrieve details of a specific inventory pool by ID",
  schema: z.object({
    id: z.number().describe("The unique ID of the inventory pool"),
  }),
});

export const listInventoryPools = tool(async ({ warehouseId, page, size }) => {
  return apiClient.fetchAsString('/inventory/pools', { warehouseId, page, size });
}, {
  name: "list_inventory_pools",
  description: "Get a paginated list of inventory pools, optionally filtered by warehouse",
  schema: z.object({
    warehouseId: z.number().optional().describe("Filter by warehouse/DC ID"),
    page: z.number().default(0).describe("Page number"),
    size: z.number().default(100).describe("Page size"),
  }),
});



export const getReservationById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/inventory-reservations/${id}`);
}, {
  name: "get_reservation_by_id",
  description: "Retrieve details of a specific inventory reservation",
  schema: z.object({
    id: z.number().describe("The unique ID of the reservation"),
  }),
});

export const getReservationsByCustomer = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/inventory-reservations/customer/${customerId}`);
}, {
  name: "get_reservations_by_customer",
  description: "Retrieve all inventory reservations for a specific customer",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const getReservedProducts = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/inventory/customers/${customerId}/reserved-products`);
}, {
  name: "get_reserved_products",
  description: "Get the list of products reserved for a specific customer from their inventory reservation",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const listReservations = tool(async ({ status, type, poolId, page, size }) => {
  return apiClient.fetchAsString('/inventory-reservations', { status, type, poolId, page, size });
}, {
  name: "list_reservations",
  description: "Get a paginated list of all reservations with optional filters",
  schema: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED', 'COMPLETED']).optional().describe("Filter by status"),
    type: z.enum(['FIXED', 'ROTATIONAL']).optional().describe("Filter by reservation type"),
    poolId: z.number().optional().describe("Filter by inventory pool ID"),
    page: z.number().default(0).describe("Page number"),
    size: z.number().default(100).describe("Page size"),
  }),
});


// ============================================================================
// ORDER TOOLS
// ============================================================================

export const getOrderById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/orders/${id}`);
}, {
  name: "get_order_by_id",
  description: "Retrieve detailed information for a specific order by its ID",
  schema: z.object({
    id: z.number().describe("The unique ID of the order"),
  }),
});

export const listOrders = tool(async ({ customerId, orderType, status, page, size, sortBy, sortDirection }) => {
  return apiClient.fetchAsStringPost('/orders', { 
    customerId, 
    orderType, 
    status, 
    page, 
    size, 
    sortBy, 
    sortDirection 
  });
}, {
  name: "list_orders",
  description: "Get a paginated list of orders. Can filter by customer, order type, or status.",
  schema: z.object({
    customerId: z.number().optional().describe("Filter by customer ID"),
    orderType: z.enum(['RENTAL', 'LEASING']).optional().describe("Filter by order type"),
    status: z.string().optional().describe("Filter by order status"),
    page: z.number().default(0).describe("Page number (0-indexed)"),
    size: z.number().default(100).describe("Page size"),
    sortBy: z.string().default('orderDate').describe("Sort field"),
    sortDirection: z.string().default('desc').describe("Sort direction (asc/desc)"),
  }),
});

export const searchOrders = tool(async ({ referenceNumber, customerId }) => {
  return apiClient.fetchAsString('/orders/search', { referenceNumber, customerId });
}, {
  name: "search_orders",
  description: "Search orders by reference number or customer ID. Returns a simplified list of matches.",
  schema: z.object({
    referenceNumber: z.string().optional().describe("The order reference number to search for"),
    customerId: z.number().optional().describe("The customer ID to filter by"),
  }),
});

export const getOrdersByCustomer = tool(async ({ customerId, page, size }) => {
  return apiClient.fetchPaginatedAsString(`/orders/customers/${customerId}/paged`, { page, size });
}, {
  name: "get_orders_by_customer",
  description: "Retrieve all orders for a specific customer (paginated). Returns {content: orders[], totalElements, totalPages, size, number}",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
    page: z.number().default(0).describe("Page number"),
    size: z.number().default(10).describe("Page size"),
  }),
});

export const getIncompleteOrdersByCustomer = tool(async ({ customerId }) => {
  return apiClient.fetchAsString(`/orders/customers/${customerId}/incomplete`);
}, {
  name: "get_incomplete_orders_by_customer",
  description: "Get all incomplete orders for a specific customer (orders that are not yet completed or cancelled)",
  schema: z.object({
    customerId: z.number().describe("The ID of the customer"),
  }),
});

export const getPickupFulfillmentForOrder = tool(async ({ orderId }) => {
  return apiClient.fetchOptional(`/orders/${orderId}/pickup-fulfillment`);
}, {
  name: "get_pickup_fulfillment_for_order",
  description: "Get the pickup fulfillment details for a specific order, including picked up items with RFID tags. Note: Not all orders have pickup fulfillment data - this is normal for orders that haven't been picked up yet or for certain order types.",
  schema: z.object({
    orderId: z.number().describe("The ID of the order"),
  }),
});




// ============================================================================
// PRODUCT TOOLS
// ============================================================================

export const getProductById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/products/${id}`);
}, {
  name: "get_product_by_id",
  description: "Retrieve detailed information for a specific product by its ID",
  schema: z.object({
    id: z.number().describe("The unique ID of the product"),
  }),
});

export const listProducts = tool(async ({ name, category, page, size, sortBy, sortDirection }) => {
  return apiClient.fetchAsString('/products', { 
    name, 
    category, 
    page, 
    size, 
    sortBy, 
    sortDirection 
  });
}, {
  name: "list_products",
  description: "Get a paginated list of products. Can filter by name or category.",
  schema: z.object({
    name: z.string().optional().describe("Filter by product name (partial match)"),
    category: z.string().optional().describe("Filter by product category"),
    page: z.number().default(0).describe("Page number (0-indexed)"),
    size: z.number().default(100).describe("Page size"),
    sortBy: z.string().default('name').describe("Sort field"),
    sortDirection: z.string().default('asc').describe("Sort direction (asc/desc)"),
  }),
});

export const searchProducts = tool(async ({ name }) => {
  return apiClient.fetchAsString('/products/search', { name });
}, {
  name: "search_products",
  description: "Search products by name. Returns a simplified list of matches.",
  schema: z.object({
    name: z.string().describe("The search query string"),
  }),
});


// ============================================================================
// ROUTE TOOLS
// ============================================================================

export const listRoutes = tool(async ({ dcId, page, size }) => {
  return apiClient.fetchAsString('/trips/routes', { dcId, page, size });
}, {
  name: "list_routes",
  description: "Get a list of delivery routes, optionally filtered by distribution center ID",
  schema: z.object({
    dcId: z.number().optional().describe("Filter by distribution center ID"),
    page: z.number().default(0).describe("Page number"),
    size: z.number().default(100).describe("Page size"),
  }),
});

export const getRouteById = tool(async ({ id }) => {
  return apiClient.fetchAsString(`/trips/routes/${id}`);
}, {
  name: "get_route_by_id",
  description: "Get details of a specific delivery route by ID, including assigned stops/points",
  schema: z.object({
    id: z.number().describe("The route ID"),
  }),
});

export const listVendors = tool(async ({ name, page, size }) => {
  return apiClient.fetchAsString('/laundry-vendors', { name, page, size });
}, {
  name: "list_vendors",
  description: "Get a list of laundry vendors. Can filter by name.",
  schema: z.object({
    name: z.string().optional().describe("Filter by vendor name (partial match)"),
    page: z.number().default(0).describe("Page number"),
    size: z.number().default(100).describe("Page size"),
  }),
});

export const searchWashRequests = tool(async ({ startTime, endTime, filterType, dcId, vendorId, status, washRequestType }) => {
  return apiClient.fetchAsStringPost('/soiled-inventory/wash-requests/search', {
    startTime,
    endTime,
    filterType,
    dcId,
    vendorId,
    status,
    washRequestType,
  });
}, {
  name: "search_wash_requests",
  description: "Search wash requests by date range and optional filters like vendor, DC, status, and wash type",
  schema: z.object({
    startTime: z.string().describe("Start date (YYYY-MM-DD)"),
    endTime: z.string().describe("End date (YYYY-MM-DD)"),
    filterType: z.enum(['CREATED_TIME', 'PLANNED_WASH_TIME', 'ACTUAL_WASH_TIME']).default('CREATED_TIME').describe("Which date field to filter on"),
    dcId: z.number().optional().describe("Filter by distribution center ID"),
    vendorId: z.number().optional().describe("Filter by laundry vendor ID"),
    status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED']).optional().describe("Filter by wash request status"),
    washRequestType: z.enum(['WASH', 'RE_WASH']).optional().describe("Filter by wash request type"),
  }),
});
