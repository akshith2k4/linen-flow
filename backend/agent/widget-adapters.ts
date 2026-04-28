/**
 * Result Formatters
 *
 * Single responsibility: transform raw API JSON strings into
 * frontend widget JSON. No tool routing, no param logic here.
 */

// ── Orders ────────────────────────────────────────────────────────────────────
function formatOrderList(toolName: string, data: any): Record<string, any> {
  const orders = Array.isArray(data) ? data : (data.content || []);
  return {
    ui_widget: "order_list",
    data: {
      title: "Orders",
      total_count: data.totalElements ?? orders.length,
      page: data.number ?? 0,
      page_size: data.size ?? orders.length,
      orders: orders.map((o: any) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName || "",
        orderDate: o.orderDate || "",
        orderType: o.orderType || "",
        status: o.status || "",
        notes: o.notes || "",
        referenceNumber: o.referenceNumber || "",
      })),
      pagination_params: { method: toolName, page: data.number ?? 0, size: data.size ?? 10 },
    },
  };
}

function formatOrderDetails(data: any): Record<string, any> {
  return { ui_widget: "order_details", data: { order: data } };
}

function formatPickupFulfillment(data: any): Record<string, any> {
  if (data?.error === "NO_DATA") {
    return { message: "This order doesn't have pickup fulfillment data yet." };
  }
  return { ui_widget: "pickup_fulfillment", data: { fulfillment: data } };
}

// ── Wash Requests ─────────────────────────────────────────────────────────────
function formatWashRequestList(data: any): Record<string, any> {
  const requests = Array.isArray(data) ? data : (data.content || []);
  return {
    ui_widget: "wash_request_list",
    data: {
      title: "Wash Requests",
      total_count: requests.length,
      requests: requests.map((w: any) => ({
        id: w.id,
        requestNumber: w.requestNumber || "",
        vendorName: w.laundryVendorName || "",
        poolName: w.referenceName || "",
        washType: w.washRequestType || "",
        status: w.status || "",
        plannedWashTime: w.plannedWashTime || "",
        recordedDate: w.washRequestRecordedDate || "",
        notes: w.notes || "",
        products: (w.productSoiledItems || []).map((p: any) => ({
          productName: p.productName || "",
          soiledQty: p.soiledQuantity ?? 0,
          washedQty: p.washedQuantity ?? 0,
          heavySoiledQty: p.heavySoiledQuantity ?? 0,
        })),
      })),
    },
  };
}

// ── Hotels ────────────────────────────────────────────────────────────────────
function formatEntityList(toolName: string, title: string, data: any, defaultSize: number, mapFn: (item: any) => any): Record<string, any> {
  const items = Array.isArray(data) ? data : (data.content || []);
  return {
    ui_widget: "entity_list",
    data: {
      title,
      total_count: data.totalElements ?? items.length,
      page: data.number ?? 0,
      page_size: data.size ?? items.length,
      entities: items.map(mapFn),
      pagination_params: { method: toolName, page: data.number ?? 0, size: data.size ?? defaultSize },
    },
  };
}

function normalizeAgreement(raw: any): any {
  return {
    ...raw,
    status: raw.isActive ? "Active" : "Inactive",
    serviceFreq: raw.serviceFrequency || raw.serviceFreq || "",
    linenDelivery: raw.linenDeliveryDays ?? raw.linenDelivery ?? "",
    billingCycle: raw.billingCycle != null ? String(raw.billingCycle) : "",
    creditDays: raw.creditDays != null ? String(raw.creditDays) : "",
    totalRooms: raw.totalRooms != null ? String(raw.totalRooms) : "",
    occupancyRate: raw.occupancyRate != null ? String(raw.occupancyRate) : "",
    depositAmount: raw.depositAmount != null ? String(raw.depositAmount) : "",
  };
}

function extractProductsFromPrices(prices: any[]): any[] {
  return prices.map((p: any) => ({
    name: p.productName || "",
    code: p.productCode || "",
    category: p.productCategory || "",
    quantity: p.quantity ?? "",
    price: p.price ?? "",
    services: p.serviceType ? [p.serviceType] : [],
  }));
}

// ── Public formatters ─────────────────────────────────────────────────────────

/**
 * Formats a single tool's raw API response into a frontend widget object.
 * Used for all tools except get_hotel_by_id (which needs formatHotelDetails).
 */
export function formatToolResult(toolName: string, rawResult: string): Record<string, any> {
  let data: any;
  try { data = JSON.parse(rawResult); } catch {
    return { message: "Received an unexpected response. Please try again." };
  }
  if (data?.error) return { message: `Could not fetch data: ${data.error}` };

  switch (true) {
    case ["list_orders", "get_orders_by_customer", "get_incomplete_orders_by_customer", "search_orders"].includes(toolName):
      return formatOrderList(toolName, data);

    case toolName === "get_order_by_id":
      return formatOrderDetails(data);

    case toolName === "get_pickup_fulfillment_for_order":
      return formatPickupFulfillment(data);

    case ["list_hotels", "search_hotels"].includes(toolName):
      return formatEntityList(toolName, "Hotels", data, 5,
        (h) => ({ id: h.id, name: h.name || "", subtext: h.code || h.email || "" }));

    case ["list_inventory_pools", "list_reservations"].includes(toolName):
      return formatEntityList(toolName,
        toolName === "list_inventory_pools" ? "Inventory Pools" : "Reservations",
        data, 10,
        (i) => ({ id: i.id, name: i.name || String(i.id), subtext: i.status || "" }));

    case ["list_products", "search_products"].includes(toolName):
      return formatEntityList(toolName, "Products", data, 10,
        (p) => ({ id: p.id, name: p.name || "", subtext: p.category || "" }));

    case toolName === "list_routes":
      return formatEntityList(toolName, "Routes", data, 20,
        (r) => ({ id: r.id, name: r.name || `Route #${r.id}`, subtext: `DC: ${r.dcId || "N/A"}` }));

    case toolName === "get_route_by_id":
      return { message: `Route **${data.name || data.id}** loaded. It has ${data.points?.length || 0} assigned stops.` };

    case toolName === "list_vendors":
      return formatEntityList(toolName, "Vendors", data, 20,
        (v) => ({ id: v.id, name: v.name || "", subtext: v.code || "" }));

    case toolName === "search_wash_requests":
      return formatWashRequestList(data);

    default:
      return { message: JSON.stringify(data).substring(0, 300) };
  }
}

/**
 * Merges hotel + agreement API responses into a single hotel_details widget.
 * Products are extracted from agreement.prices[] — no third API call needed.
 */
export function formatHotelDetails(hotelRaw: string, agreementRaw: string): Record<string, any> {
  let hotel: any = {};
  let agreement: any = null;
  let products: any[] = [];

  try { hotel = JSON.parse(hotelRaw); } catch { /* leave empty */ }

  try {
    const a = JSON.parse(agreementRaw);
    if (!a?.error) {
      const raw = Array.isArray(a) ? (a[0] ?? null) : a;
      if (raw) {
        agreement = normalizeAgreement(raw);
        if (raw.prices?.length) {
          products = extractProductsFromPrices(raw.prices);
        }
      }
    }
  } catch { /* no agreement */ }

  return {
    ui_widget: "hotel_details",
    data: {
      hotel,
      contacts: hotel.contactPersons || [],
      billing: hotel.billingAddress || {},
      agreement,
      products,
    },
  };
}
