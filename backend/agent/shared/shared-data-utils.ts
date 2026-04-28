// ============================================================================
// SHARED DATA SANITIZATION UTILITY
// ============================================================================

/**
 * Domain-specific allowed shared data keys configuration.
 * Each domain defines which keys can be carried across workflow transitions.
 * CRITICAL: Only ID fields should be allowed, never full objects.
 */
const DOMAIN_ALLOWED_KEYS: Record<string, string[]> = {
  onboarding: [
    "customer_id",
    "agreement_id",
    "last_created_id"
  ],
  orders: [
    "customer_id",
    "customerId",
    "order_id",
    "pool_id",
    "reservation_id",
    "last_created_id"
  ],
  routes: [
    "route_id",
    "customer_id",
    "last_created_id"
  ],
  wash: [
    "wash_request_id",
    "dcId",
    "laundryVendorId",
    "poolId"
  ],
  trips: [
    "trip_id",
    "dcId",
    "routeId",
    "routeName"
  ]
};

/**
 * Sanitizes shared data to only include allowed keys for a given domain.
 * Prevents data contamination across workflow transitions.
 * 
 * @param sharedData - The raw shared data object
 * @param domain - The domain name ("onboarding" or "orders")
 * @returns Filtered shared data containing only allowed ID fields
 * 
 * @example
 * ```typescript
 * const raw = { customer_id: "123", contactPersons: [...], name: "Hotel" };
 * const clean = sanitizeSharedData(raw, "onboarding");
 * // Result: { customer_id: "123" }
 * ```
 */
export function sanitizeSharedData(
  sharedData: Record<string, any>,
  domain: "onboarding" | "orders" | "routes" | "wash" | "trips"
): Record<string, any> {
  const allowedKeys = DOMAIN_ALLOWED_KEYS[domain];
  if (!allowedKeys) {
    console.warn(`⚠️  Unknown domain: ${domain}, returning empty shared data`);
    return {};
  }
  
  const sanitized: Record<string, any> = {};
  
  for (const key of allowedKeys) {
    const val = sharedData[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'object') continue; // never store full objects

    // ID fields must be numeric (or coercible to a valid number)
    // Reject sentinel strings like "gone", "undefined", "null", etc.
    if (key.toLowerCase().includes('id')) {
      const num = Number(val);
      if (isNaN(num) || num <= 0) {
        console.warn(`⚠️  sanitizeSharedData: Rejecting invalid ID value for "${key}": ${JSON.stringify(val)}`);
        continue;
      }
      sanitized[key] = num; // always store IDs as numbers
    } else {
      sanitized[key] = val;
    }
  }
  
  console.log(`🧹 sanitizeSharedData(${domain}): ${Object.keys(sharedData).length} keys → ${Object.keys(sanitized).length} keys`);
  console.log(`   Input keys: ${Object.keys(sharedData).join(', ')}`);
  console.log(`   Output keys: ${Object.keys(sanitized).join(', ')}`);
  
  return sanitized;
}

/**
 * Gets the list of allowed shared data keys for a domain.
 * Useful for validation and testing.
 */
export function getAllowedSharedDataKeys(domain: "onboarding" | "orders" | "routes" | "wash"): string[] {
  return DOMAIN_ALLOWED_KEYS[domain] || [];
}
