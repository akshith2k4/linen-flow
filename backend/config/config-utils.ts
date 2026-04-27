/**
 * Configuration-Driven Utilities
 * 
 * This module provides generic, configuration-driven utilities that replace
 * hardcoded logic in formnode.ts and apinode.ts. All behavior is driven by
 * workflows.json and workflow-metadata.json configuration, making it easy to 
 * add new workflows without touching code.
 */

import workflows from "../agent/workflows/index";
import workflowMetadata from "./workflow-metadata.json";
import { API_REGISTRY, ApiId } from "./api-registry";
import { DATA_SOURCES, DataSourceId } from "./data-sources";

// ============================================================================
// GENERIC DEEP FLATTENING
// ============================================================================

interface FlatteningConfig {
  strategy: "deep" | "shallow";
  nested_containers: string[];
  array_mappings: Record<string, string>;
  address_fields: Record<string, string[]>;
}

/**
 * Get flattening configuration from workflow-metadata.json
 */
function getFlatteningConfig(): FlatteningConfig {
  const config = (workflowMetadata as any).flattening_config;
  
  // Fallback to default config if not present
  if (!config) {
    return {
      strategy: "deep",
      nested_containers: ["rentalDetails", "laundryDetails", "billingAddress", "shippingAddress"],
      array_mappings: {
        "prices": "products"
      },
      address_fields: {
        "billingAddress": ["addressLine1", "addressLine2", "city", "state", "pincode", "country"],
        "shippingAddress": ["addressLine1", "addressLine2", "city", "state", "pincode", "country"]
      }
    };
  }
  
  return config;
}

/**
 * Generic deep flattening function that works for ANY nested structure
 * Driven by configuration in workflows.json
 */
export function flattenData(data: any): any {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  
  const config = getFlatteningConfig();
  const flat: any = { ...data };
  
  // 1. Flatten configured nested containers
  for (const container of config.nested_containers) {
    if (data[container] && typeof data[container] === 'object') {
      Object.assign(flat, data[container]);
    }
  }
  
  // ★ FIX: Also flatten any "current_*_data" containers
  // These come from fetch_current_data responses and contain the actual entity data
  for (const key of Object.keys(data)) {
    if (key.startsWith('current_') && key.endsWith('_data') && typeof data[key] === 'object') {
      Object.assign(flat, data[key]);
      
      // Also flatten nested containers within the fetched data
      for (const container of config.nested_containers) {
        if (data[key][container] && typeof data[key][container] === 'object') {
          Object.assign(flat, data[key][container]);
        }
      }
    }
  }
  
  // 2. Apply array mappings (e.g., prices -> products)
  for (const [apiKey, uiKey] of Object.entries(config.array_mappings)) {
    if (data[apiKey] && Array.isArray(data[apiKey])) {
      flat[uiKey] = data[apiKey];
    }
  }
  
  // 3. Flatten address fields with dot notation
  for (const [addressKey, fields] of Object.entries(config.address_fields)) {
    if (data[addressKey] && typeof data[addressKey] === 'object') {
      for (const field of fields) {
        flat[`${addressKey}.${field}`] = data[addressKey][field];
      }
    }
  }
  
  // 4. Generic camelCase → snake_case mapping
  const camelToSnake = (str: string): string =>
    str.replace(/([A-Z])/g, '_$1').toLowerCase();
  
  const fieldMappings = (workflowMetadata as any).field_mappings?.api_to_ui || {};
  const camelFields = (workflowMetadata as any).global_config?.camelCaseFields || [];
  
  // Apply field overrides
  for (const [apiKey, uiKey] of Object.entries(fieldMappings)) {
    if (data[apiKey] !== undefined && !flat[uiKey as string]) {
      flat[uiKey as string] = data[apiKey];
    }
  }
  
  // Auto-map camelCase fields from all sources
  const sources = [data, ...config.nested_containers.map(c => data[c]).filter(Boolean)];
  
  // ★ Also include current_*_data containers as sources
  for (const key of Object.keys(data)) {
    if (key.startsWith('current_') && key.endsWith('_data') && typeof data[key] === 'object') {
      sources.push(data[key]);
    }
  }
  
  for (const source of sources) {
    for (const key of camelFields) {
      if (source[key] !== undefined) {
        flat[camelToSnake(key)] = source[key];
      }
    }
  }
  
  return flat;
}

// ============================================================================
// CONFIGURATION-DRIVEN SESSION TRACKING
// ============================================================================

interface SessionTrackingConfig {
  entity_type: string;
  id_source: string;
  name_source?: string;
  customer_id_source?: string;
  interaction_type: "created" | "updated" | "viewed";
  track_in: string[];
  last_created_key?: string;
  also_track_customer?: SessionTrackingConfig;
}

/**
 * Get session tracking configuration for a workflow
 */
function getSessionTrackingConfig(workflowKey: string): SessionTrackingConfig | null {
  const config = (workflowMetadata as any).session_tracking?.[workflowKey];
  return config || null;
}

/**
 * Resolve a path like "result.id" or "accumulated_data.customer_id"
 * against the provided data objects
 */
function resolveSessionPath(
  path: string,
  result: any,
  accumulatedData: any
): any {
  if (path.startsWith("result.")) {
    const key = path.replace("result.", "");
    return result[key];
  }
  
  if (path.startsWith("accumulated_data.")) {
    const stripped = path.replace("accumulated_data.", "");
    
    // Handle nested paths like "_hotel_name_map[accumulated_data.customer_id]"
    if (stripped.includes("[") && stripped.includes("]")) {
      const match = stripped.match(/^([^[]+)\[accumulated_data\.([^\]]+)\]$/);
      if (match) {
        const [, mapKey, idKey] = match;
        const map = accumulatedData[mapKey!];
        const id = accumulatedData[idKey!];
        return map?.[id];
      }
    }
    
    // Simple path resolution
    return accumulatedData[stripped];
  }
  
  return undefined;
}

/**
 * Generic session tracking that works for ANY workflow
 * Driven by configuration in workflows.json
 */
export function trackSessionContext(
  workflowKey: string,
  result: any,
  accumulatedData: any,
  currentSessionContext: any
): any {
  const config = getSessionTrackingConfig(workflowKey);
  
  if (!config) {
    console.log(`ℹ️ No session tracking configured for workflow: ${workflowKey}`);
    return {};
  }
  
  const sessionUpdate: any = {};
  
  // Helper to track a single entity
  const trackEntity = (cfg: SessionTrackingConfig) => {
    const id = resolveSessionPath(cfg.id_source, result, accumulatedData);
    
    if (!id) {
      console.log(`⚠️ Could not resolve ID from ${cfg.id_source} for ${cfg.entity_type}`);
      return null;
    }
    
    const name = cfg.name_source 
      ? resolveSessionPath(cfg.name_source, result, accumulatedData) || `Unknown ${cfg.entity_type}`
      : undefined;
    
    const entry: any = {
      id,
      interaction_type: cfg.interaction_type,
      created_at: Date.now()
    };
    
    if (name) entry.name = name;
    if (cfg.customer_id_source) {
      entry.customerId = resolveSessionPath(cfg.customer_id_source, result, accumulatedData);
    }
    
    // Track in specified lists
    for (const listKey of cfg.track_in) {
      const existingList = currentSessionContext?.[listKey] || [];
      
      // For interacted_hotels, remove old entry for this ID
      if (listKey === "interacted_hotels") {
        const filtered = existingList.filter((item: any) => item.id !== id);
        sessionUpdate[listKey] = [...filtered, entry];
      } else {
        sessionUpdate[listKey] = [...existingList, entry];
      }
    }
    
    // Set last_created_key if configured
    if (cfg.last_created_key) {
      sessionUpdate[cfg.last_created_key] = entry;
    }
    
    console.log(`✅ Session Context: Tracked ${cfg.entity_type} ${name || id} (${cfg.interaction_type})`);
    
    return entry;
  };
  
  // Track primary entity
  trackEntity(config);
  
  // Track secondary entity if configured (e.g., customer in agreement workflow)
  if (config.also_track_customer) {
    trackEntity(config.also_track_customer);
  }
  
  return sessionUpdate;
}

// ============================================================================
// FIELD MAPPING UTILITIES (moved from formnode.ts)
// ============================================================================

/**
 * Get field mapping configuration from workflow-metadata.json
 */
export function getFieldMappingConfig(direction: 'ui_to_api' | 'api_to_ui' = 'ui_to_api'): Record<string, string> {
  const configMappings = (workflowMetadata as any).field_mappings?.[direction] || {};
  
  // Hardcoded fallback for backward compatibility
  const FALLBACK_OVERRIDES: Record<string, string> = {
    'type': 'agreement_type',
    'startDate': 'start_date',
    'endDate': 'end_date',
  };
  
  return { ...FALLBACK_OVERRIDES, ...configMappings };
}

/**
 * Get camelCase fields list from workflow-metadata.json
 */
export function getCamelCaseFields(): string[] {
  const configFields = (workflowMetadata as any).global_config?.camelCaseFields || [];
  
  const FALLBACK_CAMEL_FIELDS = [
    'totalRooms', 'occupancyRate', 'depositAmount', 'creditDays',
    'billingType', 'billingStartDay', 'billingEndDay', 'billingCycle',
    'linenDeliveryDays', 'serviceFrequency', 'fixedMonthlyAmount', 'creditTermDays',
  ];
  
  return configFields.length > 0 ? configFields : FALLBACK_CAMEL_FIELDS;
}

/**
 * Get workflow type from configuration
 */
export function getWorkflowType(workflowKey: string): 'create' | 'update' | 'delete' | 'unknown' {
  const workflow = workflows[workflowKey as keyof typeof workflows] as any;
  
  if (workflow?._metadata?.workflowType) {
    return workflow._metadata.workflowType;
  }
  
  const globalConfig = (workflowMetadata as any).global_config?.workflowTypes || {};
  for (const [type, keys] of Object.entries(globalConfig)) {
    if (Array.isArray(keys) && keys.includes(workflowKey)) {
      return type as 'create' | 'update' | 'delete';
    }
  }
  
  // Fallback to string matching
  if (workflowKey.startsWith("update_")) return 'update';
  if (workflowKey.startsWith("create_") || workflowKey === "generate_agreement") return 'create';
  if (workflowKey.startsWith("delete_")) return 'delete';
  
  return 'unknown';
}

/**
 * Resolve an API ID to its contract
 */
export function resolveApi(apiId: string | any): any {
  if (typeof apiId === 'string' && API_REGISTRY[apiId as ApiId]) {
    return API_REGISTRY[apiId as ApiId];
  }
  return apiId;
}

/**
 * Resolve a Data Source ID to its configuration
 */
export function resolveDataSource(dsId: string | any): any {
  if (typeof dsId === 'string' && DATA_SOURCES[dsId as DataSourceId]) {
    return DATA_SOURCES[dsId as DataSourceId];
  }
  return dsId;
}

/**
 * Get prerequisite check start step from configuration
 */
export function getPrerequisiteCheckStartStep(workflowKey: string, workflowType: string): number {
  const workflow = workflows[workflowKey as keyof typeof workflows] as any;
  
  if (workflow?.formBehavior?.prerequisiteCheckStartStep !== undefined) {
    return workflow.formBehavior.prerequisiteCheckStartStep;
  }
  
  return workflowType === 'update' ? 3 : 1;
}

/**
 * Get minimum entries for multi-entry forms
 */
export function getMinEntries(stepForm: any): number {
  if (stepForm.min_entries !== undefined) {
    return stepForm.min_entries;
  }
  
  const globalDefaults = (workflowMetadata as any).global_config?.defaults;
  if (globalDefaults?.minEntries !== undefined) {
    return globalDefaults.minEntries;
  }
  
  return 1;
}

/**
 * Check if a field has special handling configured
 */
export function getFieldSpecialHandling(fieldName: string): { type: string; behavior: string } | null {
  const specialHandlers = (workflowMetadata as any).global_config?.specialFieldHandlers || {};
  return specialHandlers[fieldName] || null;
}

/**
 * Get proper field mapping from workflows.json instead of using heuristics
 */
export function getFieldMapping(userField: string, direction: 'ui_to_api' | 'api_to_ui' = 'ui_to_api'): string {
  const mappings = getFieldMappingConfig(direction);
  return mappings[userField.toLowerCase()] || userField;
}

/**
 * Helper function to read nested object values using dot-path notation
 * e.g., "billingAddress.city" -> obj.billingAddress.city
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path.includes('.')) {
    return obj[path];
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Check if a user field matches a target field using proper mapping
 * More strict to avoid false positives
 */
export function isFieldMatch(userField: string, targetField: string): boolean {
  const normalizedUser = userField.toLowerCase().replace(/[_\-\s]/g, '');
  const normalizedTarget = targetField.toLowerCase().replace(/[_\-\s]/g, '');
  
  // Direct match after normalization
  if (normalizedUser === normalizedTarget) return true;
  
  // Forward mapping only (user input -> API field)
  const mappedField = getFieldMapping(userField, 'ui_to_api');
  if (mappedField.toLowerCase().replace(/[_\-\s]/g, '') === normalizedTarget) return true;
  
  // ★ FIX: Word-boundary check for multi-word aliases mapping to single canonical fields
  // e.g., "customer type" → words ["customer", "type"] → "type" is in the list → matches "type"
  // e.g., "phone number" → words ["phone", "number"] → "phone" is in the list → matches "phone"
  // e.g., "email address" → words ["email", "address"] → "email" is in the list → matches "email"
  // Guard: only apply when target is a short single word (avoids false positives on nested fields)
  if (!targetField.includes('.') && !normalizedTarget.includes('.')) {
    const userWords = userField.toLowerCase().split(/[\s_\-]+/);
    if (userWords.includes(normalizedTarget)) return true;
  }
  
  // Handle nested field matching (e.g., "billing address" -> "billingAddress.addressLine1")
  if (targetField.includes('.')) {
    const parts = targetField.split('.');
    const container = parts[0];
    const rest = parts.slice(1);
    
    if (container) {
      const containerNorm = container.toLowerCase();
      const restNorm = rest.map(p => p.toLowerCase());
      
      // Check if user field contains the container and all nested parts
      if (normalizedUser.includes(containerNorm) && 
          restNorm.every(part => normalizedUser.includes(part.replace(/[_\-\s]/g, '')))) {
        return true;
      }
    }
  }
  
  return false;
}
