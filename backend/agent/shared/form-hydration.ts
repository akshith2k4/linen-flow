/**
 * Form Data Hydration Module
 * 
 * Generic data fetching and flattening for workflow form steps.
 * Handles API calls, data transformation, and context hydration.
 */

import { resolveStepContracts } from "./contract-resolver";
import { flattenData } from "../../config/config-utils";

/**
 * Fetch data for a single step based on its fetch_current_data configuration.
 * 
 * Features:
 * - Resolves fetch configs via resolveStepContracts (handles API_REGISTRY refs)
 * - Supports both single config and array of configs
 * - Skips if already fetched (store_as key exists)
 * - Resolves {{accumulated_data.xxx}} placeholders in endpoints
 * - Skips if required parameters are missing
 * - Applies transform.map_to_options if configured
 * - Flattens nested data via flattenData
 * - Handles both internal backend proxy endpoints and external API URLs
 * 
 * @param stepConfig - The step configuration from workflow JSON
 * @param accumulatedData - Current accumulated data (may contain already-fetched data)
 * @param authToken - API authentication token
 * @returns Promise<any> - Merged accumulated data with fetched and flattened data
 */
export async function fetchStepData(
  stepConfig: any,
  accumulatedData: any,
  authToken: string | undefined
): Promise<any> {
  const resolved = resolveStepContracts(stepConfig);
  
  // Support both single fetch config and array of fetch configs
  const fetchConfigs = Array.isArray(resolved.fetch_current_data)
    ? resolved.fetch_current_data
    : resolved.fetch_current_data
    ? [resolved.fetch_current_data]
    : [];

  // If no fetch configs, check if we have existing current_*_data to flatten
  if (fetchConfigs.length === 0) {
    const currentDataKeys = Object.keys(accumulatedData).filter(
      (k) => k.startsWith("current_") && k.endsWith("_data")
    );
    
    if (currentDataKeys.length > 0) {
      console.log(`✅ Found existing fetched data (${currentDataKeys.join(', ')}), flattening for current step`);
      let result = { ...accumulatedData };
      for (const key of currentDataKeys) {
        const flattened = flattenData(accumulatedData[key]);
        // User-submitted data in result always wins over re-flattened API data
        result = { ...flattened, ...result };
      }
      return result;
    }
    
    return accumulatedData;
  }

  let result = { ...accumulatedData };

  // Process each fetch config
  for (const fetchConfig of fetchConfigs) {
    const storeKey = fetchConfig.store_as || "last_fetched_data";

    // Skip if already fetched
    if (result[storeKey]) {
      console.log(`✅ Data already fetched (${storeKey}), re-flattening for current step`);
      const flattened = flattenData(result[storeKey]);
      // User-submitted data in result always wins over re-flattened API data
      result = { ...flattened, ...result };
      continue;
    }

    // Resolve {{accumulated_data.xxx}} placeholders in endpoint
    let endpoint = fetchConfig.endpoint;
    const matches = endpoint.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
      let skipFetch = false;
      
      for (const match of matches) {
        let path = match.slice(2, -2);
        if (path.startsWith("accumulated_data.")) {
          path = path.replace("accumulated_data.", "");
        }
        
        const val = result[path];
        
        // Skip fetch if required parameter is missing
        if (!val) {
          console.log(`⏭️ Skipping fetch - missing required parameter: ${path}`);
          skipFetch = true;
          break;
        }
        
        endpoint = endpoint.replace(match, String(val));
      }
      
      if (skipFetch) continue;
    }

    try {
      // Determine full endpoint URL
      // For internal backend proxy endpoints (start with /), use localhost
      // For external API URLs (start with http), use as-is
      const fullEndpoint = endpoint.startsWith("http")
        ? endpoint
        : endpoint.startsWith("/")
        ? `http://localhost:${process.env.PORT || 8050}${endpoint}`
        : `${process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com"}${endpoint}`;

      console.log(`🔄 FormNode fetching step data from: ${fullEndpoint}`);

      const response = await fetch(fullEndpoint, {
        method: fetchConfig.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-company-id": "1",
          ...(fetchConfig.headers || {}),
        },
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        
        // For list endpoints: extract content array. For single-object endpoints: store as-is.
        const items = Array.isArray(data) ? data : (data?.content ?? data);
        result[storeKey] = items;
        
        const count = Array.isArray(items) ? items.length : 1;
        console.log(`✅ Fetched ${count} item(s) for ${storeKey}`);

        // Apply transform.map_to_options if configured
        if (fetchConfig.transform?.map_to_options && Array.isArray(items)) {
          const valueKey = fetchConfig.transform.value_key || "id";
          const labelKey = fetchConfig.transform.label_key || "name";

          result[`${storeKey}_options`] = items.map((item: any) => ({
            value: item[valueKey],
            label: item[labelKey],
            ...item,
          }));
          
          console.log(`✅ Transformed ${items.length} items to dropdown options`);
        }

        // Flatten the fetched data
        const flattened = flattenData(items);
        
        // Validate flattening for known data types
        if (storeKey === "current_order_data") {
          const hasExpectedFields =
            flattened.pickupDate ||
            flattened.deliveryDate ||
            flattened.deliveryItems ||
            flattened.pickupItems ||
            flattened.leasingOrderType;
          
          if (!hasExpectedFields) {
            console.warn(`⚠️ Flattening may have failed - no expected order fields found`);
            console.warn(`Available keys:`, Object.keys(flattened).slice(0, 20));
          }
        }

        // Merge flattened data (user-submitted data in result always wins)
        result = { ...flattened, ...result };
      } else {
        const errText = await response.text();
        console.error(`❌ Fetch failed: ${response.status} ${errText}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${storeKey}:`, error);
    }
  }

  return result;
}

/**
 * Hydrate context data by fetching for all steps up to the current step.
 * This ensures all previous step data is available for the current step.
 * 
 * @param steps - Array of all workflow steps
 * @param currentStepNum - Current step number
 * @param accumulatedData - Current accumulated data
 * @param authToken - API authentication token
 * @returns Promise<any> - Fully hydrated accumulated data
 */
export async function hydrateContextData(
  steps: any[],
  currentStepNum: number,
  accumulatedData: any,
  authToken: string | undefined
): Promise<any> {
  console.log(`\n🔄 CONTEXT HYDRATION: Fetching data for steps up to ${currentStepNum}`);
  let hydratedData = accumulatedData;

  for (const step of steps) {
    hydratedData = await fetchStepData(step, hydratedData, authToken);
    if (step.step === currentStepNum) break;
  }

  return hydratedData;
}
