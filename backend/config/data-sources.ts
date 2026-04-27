export type DataSourceId =
  | "CUSTOMER_SEARCH"
  | "PRODUCT_LIST"
  | "INVENTORY_POOLS"
  | "POOL_PRODUCTS"
  | "ROUTE_SEARCH"
  | "VENDOR_LIST"
  | "DC_LIST";

export interface DataSource {
  endpoint: string;
  field_type: "lookup" | "dropdown";
  value_key: string;
  label_key: string;
  search_param?: string;
  search_on_frontend?: boolean;
  depends_on?: string;
}

export const DATA_SOURCES: Record<DataSourceId, DataSource> = {
  CUSTOMER_SEARCH: {
    endpoint: "/api/customers/search",
    field_type: "lookup",
    value_key: "id",
    label_key: "name",
    search_param: "name",
    search_on_frontend: true,
  },

  PRODUCT_LIST: {
    endpoint: "/api/products",
    field_type: "dropdown",
    value_key: "id",
    label_key: "name",
  },

  INVENTORY_POOLS: {
    endpoint: "/api/inventory/pools",
    field_type: "dropdown",
    value_key: "id",
    label_key: "name",
  },

  POOL_PRODUCTS: {
    endpoint: "/api/inventory-pool-products/{{poolId}}",
    field_type: "dropdown",
    value_key: "productId",
    label_key: "productName",
    depends_on: "poolId",
  },

  ROUTE_SEARCH: {
    endpoint: "/api/trips/routes",
    field_type: "lookup",
    value_key: "id",
    label_key: "name",
    search_param: "name",
    search_on_frontend: true,
  },

  VENDOR_LIST: {
    endpoint: "/api/laundry-vendors",
    field_type: "dropdown",
    value_key: "id",
    label_key: "name",
  },
  DC_LIST: {
    endpoint: "/api/distribution-centers",
    field_type: "dropdown",
    value_key: "id",
    label_key: "name",
  }
};

export function resolveDataSourceEndpoint(
  ds: DataSource,
  accumulatedData: Record<string, any>
): string | null {
  let endpoint = ds.endpoint;
  const matches = endpoint.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return endpoint;

  for (const match of matches) {
    const key = match.slice(2, -2);
    const val = accumulatedData[key];
    if (val === undefined || val === null || val === "") return null;
    endpoint = endpoint.replace(match, String(val));
  }

  return endpoint;
}
