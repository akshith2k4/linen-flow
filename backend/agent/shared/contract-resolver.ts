import { API_REGISTRY, type ApiId } from "../../config/api-registry";

/**
 * Resolves string API references in a step config.
 * Converts "fetch_current_data": "GET_CUSTOMER" 
 * into the full object from API_REGISTRY.
 */
export function resolveStepContracts(stepConfig: any): any {
  if (!stepConfig) return stepConfig;

  const resolved = { ...stepConfig };

  // Resolve fetch_current_data string → full object
  if (typeof resolved.fetch_current_data === 'string') {
    const contract = API_REGISTRY[resolved.fetch_current_data as ApiId];
    if (contract) {
      resolved.fetch_current_data = { ...contract };
    } else {
      console.warn(`Unknown fetch contract: "${resolved.fetch_current_data}"`);
      delete resolved.fetch_current_data;
    }
  } else if (Array.isArray(resolved.fetch_current_data)) {
    // Handle array of strings
    resolved.fetch_current_data = resolved.fetch_current_data.map((item: any) => {
      if (typeof item === 'string') {
        const contract = API_REGISTRY[item as ApiId];
        return contract ? { ...contract } : null;
      }
      return item;
    }).filter(Boolean);
  }

  // Resolve api string → full object
  if (typeof resolved.api === 'string') {
    const contract = API_REGISTRY[resolved.api as ApiId];
    if (contract) {
      resolved.api = { ...contract };
    } else {
      console.warn(`Unknown api contract: "${resolved.api}"`);
    }
  }

  return resolved;
}
