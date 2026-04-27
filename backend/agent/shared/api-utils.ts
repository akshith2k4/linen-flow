/**
 * Shared API utilities for workflow nodes
 */

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Fetch with exponential backoff retry logic
 * Returns parsed JSON response directly
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  maxRetries: number | RetryConfig = 3
): Promise<any> {
  // Handle both number and config object for maxRetries
  const config: RetryConfig = typeof maxRetries === 'number' 
    ? { maxAttempts: maxRetries, baseDelayMs: 500, timeoutMs: 15000 }
    : maxRetries;
  
  const { maxAttempts = 3, baseDelayMs = 500, timeoutMs = 15000 } = config;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log(`📡 API call (attempt ${attempt + 1}/${maxAttempts}): ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        console.warn(`⚠️ Attempt ${attempt + 1} returned ${response.status}: ${text.substring(0, 100)}`);
        
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      
      // Try to parse as JSON, return raw text if it fails
      try {
        return JSON.parse(text);
      } catch {
        console.log("ℹ️ API returned non-JSON success response");
        return text;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;
      
      console.error(`❌ Attempt ${attempt + 1} error:`, error);
      
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`All ${maxAttempts} API call attempts failed for ${url}: ${lastError?.message}`);
}

import { resolvePath } from "./payload-utils";
import { resolveApi } from "../../config/config-utils";

/**
 * Execute a `fetch_current_data` config block that appears on a workflow step.
 *
 * Resolves `{{accumulated_data.xxx}}` placeholders in the endpoint, fires the
 * request, stores the result under `store_as`, and returns the updated data
 * object.  If the required path parameter is missing the fetch is skipped and
 * the original data is returned unchanged.
 *
 * @param stepConfig      - The step config object (must have `.fetch_current_data`)
 * @param accumulatedData - Current accumulated data (not mutated)
 * @param authToken       - Bearer token for the Authorization header
 * @returns Updated accumulated data with the fetched result stored
 */
export async function triggerFetchCurrentData(
  stepConfig: any,
  accumulatedData: Record<string, any>,
  authToken: string | undefined
): Promise<Record<string, any>> {
  const fcRaw = stepConfig.fetch_current_data;
  if (!fcRaw) return accumulatedData;

  // Support both single and multiple fetch configs
  const configs = Array.isArray(fcRaw) ? fcRaw : [fcRaw];
  let currentData = { ...accumulatedData };

  for (const raw of configs) {
    const fc = resolveApi(raw);
    if (!fc || typeof fc !== 'object') continue;

    const storeKey: string = fc.store_as || "last_fetched_data";

    // Already fetched — skip
    if (currentData[storeKey]) continue;

    let endpoint: string = fc.endpoint;
    const matches = endpoint.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      let skip = false;
      for (const match of matches) {
        let path = match.slice(2, -2);
        if (!path.startsWith("accumulated_data.")) path = `accumulated_data.${path}`;
        const val = resolvePath(currentData, path);
        if (val === undefined || val === null || val === "") {
          console.log(`⏭️ [triggerFetchCurrentData] Skipping fetch — missing param: ${path}`);
          skip = true;
          break;
        }
        endpoint = endpoint.replace(match, String(val));
      }
      if (skip) continue;
    }

    console.log(`🔄 [triggerFetchCurrentData] Fetching: ${fc.method || "GET"} ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: fc.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(fc.headers || {}),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ [triggerFetchCurrentData] ${response.status}: ${text.substring(0, 200)}`);
        continue;
      }

      const data = await response.json() as any;
      
      // Support transform logic from registry
      let finalData = data;
      if (fc.transform?.map_to_options) {
        const items = Array.isArray(data) ? data : (data.content || []);
        finalData = items.map((item: any) => {
          const option: any = {
            value: String(item[fc.transform.value_key || 'id']),
            label: item[fc.transform.label_key || 'name'],
          };
          if (fc.transform.include_fields) {
            fc.transform.include_fields.forEach((f: string) => {
              option[f] = item[f];
            });
          }
          return option;
        });
      }

      console.log(`✅ [triggerFetchCurrentData] Stored as: ${storeKey}`);
      currentData = { ...currentData, [storeKey]: finalData };
    } catch (err) {
      console.error(`❌ [triggerFetchCurrentData] Fetch failed:`, err);
    }
  }

  return currentData;
}
