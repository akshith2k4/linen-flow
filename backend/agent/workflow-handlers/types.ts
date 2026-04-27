/**
 * Core interface - every handler must implement these methods.
 * buildPayload: Transforms accumulated data into API payload
 * handleResponse: Extracts shared IDs from API response (required for auditability)
 */
export interface WorkflowHandler {
  buildPayload(accumulatedData: any): any;
  handleResponse(result: any): { sharedIds: Record<string, any> };
}

/**
 * Optional capability: Payload validation with Zod or custom logic
 */
export interface Validatable {
  validatePayload(payload: any): { success: boolean; data?: any; errors?: string[] };
}

/**
 * Optional capability: Transform specific payload fields (e.g., normalize items arrays)
 */
export interface Filterable {
  filterItems(key: string, value: any, data: any): any;
}

/**
 * Optional capability: Skip API call under certain conditions (e.g., no changes detected)
 * Note: shouldSkipApi and getSkipMessage must be implemented together
 */
export interface Skippable {
  shouldSkipApi(payload: any, accumulatedData: any): boolean;
  getSkipMessage(payload: any, accumulatedData: any): string;
}

/**
 * Type guards for checking optional capabilities
 */
export function isValidatable(handler: WorkflowHandler): handler is WorkflowHandler & Validatable {
  return typeof (handler as any).validatePayload === "function";
}

export function isFilterable(handler: WorkflowHandler): handler is WorkflowHandler & Filterable {
  return typeof (handler as any).filterItems === "function";
}

export function isSkippable(handler: WorkflowHandler): handler is WorkflowHandler & Skippable {
  return typeof (handler as any).shouldSkipApi === "function" && 
         typeof (handler as any).getSkipMessage === "function";
}
