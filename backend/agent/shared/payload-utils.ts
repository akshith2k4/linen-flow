/**
 * Shared payload building utilities for API nodes
 */

/**
 * Resolve a path from accumulated_data, supporting:
 * - Simple paths: "accumulated_data.customer_id"
 * - Nested paths: "accumulated_data.customer.id"
 * - Ternary expressions: "accumulated_data.useAlternate ? accumulated_data.primary : accumulated_data.secondary"
 * - Complex expressions: "accumulated_data.orderType === 'LEASING' ? { ... } : null"
 */
export function resolvePath(accumulatedData: any, path: string): any {
  if (!path.startsWith('accumulated_data.')) {
    return path;
  }

  // Handle complex JavaScript expressions by evaluating them safely
  if (path.includes('===') || path.includes('!==') || path.includes('||') || path.includes('&&')) {
    try {
      // Use Function constructor for safe evaluation (better than eval)
      const evalFunc = new Function('accumulated_data', `return ${path}`);
      return evalFunc(accumulatedData);
    } catch (error) {
      console.error(`Failed to evaluate expression: ${path}`, error);
      return undefined;
    }
  }

  // Handle simple ternary expressions
  const ternaryMatch = path.match(/accumulated_data\.(\w+)\s*\?\s*accumulated_data\.(\w+)\s*:\s*accumulated_data\.(\w+)/);
  if (ternaryMatch) {
    const [, conditionKey, trueKey, falseKey] = ternaryMatch;
    if (conditionKey && trueKey && falseKey) {
      const condition = accumulatedData[conditionKey];
      const selectedKey = condition ? trueKey : falseKey;
      return accumulatedData[selectedKey];
    }
  }

  // Handle simple and nested paths
  const keys = path.replace('accumulated_data.', '').split('.');
  let value = accumulatedData;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Convert date strings to ISO format with time (for orders only)
 * Recursively handles nested objects and arrays
 */
function convertDateIfNeeded(value: any, convertDates: boolean): any {
  if (!convertDates) {
    return value;
  }

  // Handle strings - convert YYYY-MM-DD to ISO DateTime
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  // Handle arrays - recursively convert dates in array items
  if (Array.isArray(value)) {
    return value.map(item => convertDateIfNeeded(item, convertDates));
  }

  // Handle objects - recursively convert dates in object properties
  if (value && typeof value === 'object') {
    const converted: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertDateIfNeeded(val, convertDates);
    }
    return converted;
  }

  return value;
}

/**
 * Build API payload from mapping configuration
 * @param mapping - Field mapping configuration
 * @param accumulatedData - Current workflow accumulated data
 * @param domainFilter - Optional callback to filter/transform domain-specific data
 * @param options - Optional configuration for payload building
 */
export function buildPayload(
  mapping: Record<string, any>,
  accumulatedData: any,
  domainFilter?: (key: string, value: any, accumulatedData: any) => any,
  options?: { convertDates?: boolean }
): Record<string, any> {
  const payload: Record<string, any> = {};
  const convertDates = options?.convertDates ?? false;

  for (const [key, value] of Object.entries(mapping)) {
    // Skip internal keys
    if (key.startsWith('_')) continue;

    if (typeof value === 'string' && value.startsWith('accumulated_data.')) {
      const resolved = resolvePath(accumulatedData, value);
      payload[key] = convertDateIfNeeded(resolved, convertDates);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse for nested objects
      const nestedResult = buildPayload(value as Record<string, any>, accumulatedData, domainFilter, options);
      if (Object.keys(nestedResult).length > 0) {
        payload[key] = nestedResult;
      }
    } else {
      payload[key] = convertDateIfNeeded(value, convertDates);
    }
  }

  // Apply domain-specific filtering if provided
  if (domainFilter) {
    for (const [key, value] of Object.entries(payload)) {
      const filtered = domainFilter(key, value, accumulatedData);
      if (filtered !== undefined) {
        payload[key] = filtered;
      }
    }
  }

  return payload;
}

/**
 * Sanitize API result before storing in accumulated data
 * Strips all fields except ID fields to prevent data bloat
 */
export function sanitizeResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  if (Array.isArray(result)) {
    return result.map(sanitizeResult);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(result)) {
    if (key.toLowerCase().includes('id')) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
