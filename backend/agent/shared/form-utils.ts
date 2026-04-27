/**
 * Shared form utilities for workflow nodes
 */

import { IntentState } from "../state";

const MAX_RECURSION_DEPTH = 10;

/**
 * Check if recursion depth has been exceeded in form node execution
 * Returns error state if depth exceeded, null otherwise
 * Prevents infinite loops in auto-skip and jump logic
 */
export function checkFormRecursionDepth(
  state: IntentState, 
  recursionDepth: number
): Partial<IntentState> | null {
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    console.error(`❌ FormNode: Max recursion depth (${MAX_RECURSION_DEPTH}) reached`);
    return { 
      workflow_result: { 
        ...state.workflow_result,
        selected_workflow: state.workflow_result?.selected_workflow || null,
        currentstep: state.workflow_result?.currentstep || 1,
        message: "Error: Too many form redirects. Please try again." 
      } as any,
      entity_context: {
        ...(state.entity_context as any),
        current_step: state.workflow_result?.currentstep || 1,
        message: "Error: Too many form redirects. Please try again."
      }
    };
  }
  return null;
}

/**
 * Evaluate a skip condition against accumulated data
 * Supports both 'skip_if' (onboarding format) and 'conditional_skip' (orders format)
 */
export function shouldSkipStep(
  stepConfig: any,
  accumulatedData: any
): boolean {
  // Handle onboarding format: skip_if with === comparison
  if (stepConfig.skip_if && typeof stepConfig.skip_if === 'string') {
    const condition: string = stepConfig.skip_if;
    
    if (condition.includes('===')) {
      const parts = condition.split('===').map((s: string) => s.trim());
      if (parts.length < 2) return false;
      
      const [path, expected] = parts;
      if (!path || !expected) return false;
      
      // Strip accumulated_data. prefix and resolve value
      const stripped = path.replace(/^accumulated_data\./, '');
      const val = accumulatedData[stripped];
      
      const expectedNormalized = expected === 'true' ? true : expected === 'false' ? false : expected.replace(/['"]/g, '');
      const shouldSkip = val === expectedNormalized;
      
      // Debug logging for skip_if evaluation
      console.log(`🔍 [shouldSkipStep] skip_if evaluation:`, {
        condition,
        path,
        expected,
        actualValue: val,
        expectedNormalized,
        shouldSkip
      });
      
      return shouldSkip;
    }
  }
  
  // Handle orders format: conditional_skip with when_field + equals
  if (stepConfig.conditional_skip) {
    const condition = stepConfig.conditional_skip;
    
    if (condition.when_field && condition.equals !== undefined) {
      const fieldValue = accumulatedData[condition.when_field];
      const shouldSkip = fieldValue === condition.equals;
      
      // Debug logging for conditional_skip evaluation
      console.log(`🔍 [shouldSkipStep] conditional_skip evaluation:`, {
        when_field: condition.when_field,
        equals: condition.equals,
        actualValue: fieldValue,
        shouldSkip
      });
      
      return shouldSkip;
    }
  }
  
  return false;
}

/**
 * Normalise a raw field value for display in a date or datetime-local input.
 *
 * - 'date'           → strips time component, returns YYYY-MM-DD
 * - 'datetime-local' → keeps time component, strips milliseconds/timezone
 *
 * Returns undefined when the value is absent or cannot be parsed.
 */
export function safeDateFieldValue(
  value: any,
  type: 'date' | 'datetime-local'
): string | undefined {
  if (!value || typeof value !== 'string') return undefined;

  try {
    if (type === 'date') {
      let result = value;

      if (result.includes('T')) {
        result = result.split('T')[0]!;
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(result)) {
        const [dd, mm, yyyy] = result.split('/');
        const candidate = `${yyyy}-${mm}-${dd}`;
        if (!isNaN(new Date(candidate).getTime())) result = candidate;
      }

      if (result && isNaN(new Date(result).getTime())) {
        console.warn(`📅 [safeDateFieldValue] Invalid date value, clearing: "${value}"`);
        return undefined;
      }

      return result || undefined;
    }

    if (type === 'datetime-local') {
      if (value.includes('T')) {
        // "2026-04-18T14:30:00.000Z" → "2026-04-18T14:30:00"
        const parts = value.split('.');
        return parts[0]?.replace('Z', '') || undefined;
      }
      return value;
    }
  } catch {
    console.warn(`📅 [safeDateFieldValue] Parse error for value: "${value}"`);
  }

  return undefined;
}

/**
 * Read a nested object value using dot-path notation.
 * e.g., "billingAddress.city" → obj.billingAddress.city
 * Falls back to undefined if any segment is missing.
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path.includes('.')) return obj[path];

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
 * Check whether all requested fields are present on the target step.
 * If any field is missing, returns the step number where that field lives.
 * Returns null when all fields are accounted for on the target step.
 *
 * Used by both onboarding and orders jump logic.
 */
export function validateFieldsInTargetStep(
  targetStepConfig: any,
  fieldsToUpdate: string[],
  steps: any[],
  isFieldMatch: (req: string, fieldName: string) => boolean
): number | null {
  const targetForm = targetStepConfig.form as any;
  const targetFields: any[] = targetForm?.fields || [];
  const targetListKey: string = targetForm?.list_key || "";

  const missingFields = fieldsToUpdate.filter((req: string) => {
    const isHere = targetFields.some((f: any) => isFieldMatch(req, f.name));
    const isListKey = targetListKey && isFieldMatch(req, targetListKey);
    return !isHere && !isListKey;
  });

  if (missingFields.length === 0) return null;

  for (const step of steps) {
    const stepForm = step.form as any;
    const stepFields: any[] = stepForm?.fields || [];
    const stepListKey: string = stepForm?.list_key || "";

    const hasMissing = missingFields.some(req => {
      const reqLower = req.toLowerCase();
      return (
        stepFields.some((f: any) => f.name.toLowerCase() === reqLower) ||
        (stepListKey && reqLower.includes(stepListKey.toLowerCase()))
      );
    });

    if (hasMissing) return step.step;
  }

  return null;
}

/**
 * Check if a step is filled with all required data.
 * Returns true if the step has all required fields populated.
 * 
 * For multi-entry forms: checks if minimum entries exist
 * For single forms: checks if all required fields have values
 * Review steps are never considered "filled" (always show them)
 * 
 * Uses getMinEntries from config-utils for multi-entry minimum threshold
 */
export function isStepFilled(step: any, accumulatedData: any, getMinEntries: (stepForm: any) => number): boolean {
  const stepForm = step.form as any;
  if (!stepForm || stepForm.type === "review") return false; // Never skip review steps
  
  if (stepForm.multiple) {
    const listKey = stepForm.list_key;
    const minEntries = getMinEntries(stepForm);
    const existingData = accumulatedData[listKey];
    return Array.isArray(existingData) && existingData.length >= minEntries;
  }

  const fields = stepForm.fields || [];
  if (fields.length === 0) return true;

  return fields.every((f: any) => {
    if (f.required === false) return true;
    
    // Use getNestedValue helper to properly read nested objects
    const val = getNestedValue(accumulatedData, f.name);
    
    return val !== undefined && val !== null && val !== "" && (Array.isArray(val) ? val.length > 0 : true);
  });
}

/**
 * Resolve customer_id from accumulated data or session context.
 * Handles both numeric IDs and string names.
 * 
 * Returns:
 * - The numeric customer_id if already present
 * - null if customer_id is missing or cannot be resolved
 * 
 * This function does NOT throw errors - it returns null on failure
 * to allow the form to handle missing customer_id gracefully.
 */
export function resolveCustomerId(accumulatedData: any, sessionContext: any): number | null {
  // Check both snake_case and camelCase formats
  const customerId = accumulatedData.customer_id || accumulatedData.customerId;
  
  if (!customerId) {
    return null;
  }
  
  // If it's already a number, return it
  if (typeof customerId === 'number') {
    return customerId;
  }
  
  // If it's a numeric string, parse and return
  if (typeof customerId === 'string') {
    const parsed = parseInt(customerId, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // If it's a non-numeric string (hotel name), try to resolve from session
    const hotelNameMap = accumulatedData._hotel_name_map || {};
    const interactedHotels = sessionContext?.interacted_hotels || [];
    
    // Try to find by name in the name map
    for (const [id, name] of Object.entries(hotelNameMap)) {
      if (name === customerId) {
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
          return parsedId;
        }
      }
    }
    
    // Try to find by name in interacted hotels
    const hotel = interactedHotels.find((h: any) => h.name === customerId);
    if (hotel && hotel.id) {
      const parsedId = typeof hotel.id === 'number' ? hotel.id : parseInt(hotel.id, 10);
      if (!isNaN(parsedId)) {
        return parsedId;
      }
    }
  }
  
  // Could not resolve - return null
  return null;
}
