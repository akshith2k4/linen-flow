/**
 * Workflow Type Configuration
 * Single source of truth for workflow type classification
 */

export type WorkflowType = 'create' | 'update' | 'delete' | 'unknown';

/**
 * Explicit workflow type mappings
 * This is the authoritative source - no fallback logic needed
 */
export const WORKFLOW_TYPES: Record<string, WorkflowType> = {
  // Onboarding workflows
  'hotel_onboarding': 'create',
  'update_hotel': 'update',
  'generate_agreement': 'create',
  'update_agreement': 'update',
  'create_inventory_reservation': 'create',
  
  // Order workflows
  'create_order': 'create',
  'update_order': 'update',

  // Route workflows
  'create_route': 'create',
  'assign_route_points': 'update',

  // Wash workflows
  'create_wash_request': 'create',

  // Trip workflows
  'create_trip': 'create',
};

/**
 * Gets the workflow type for a given workflow key
 * Returns 'unknown' if workflow is not in the configuration
 */
export function getWorkflowType(workflowKey: string): WorkflowType {
  return WORKFLOW_TYPES[workflowKey] || 'unknown';
}

/**
 * Checks if a workflow is a creation workflow
 */
export function isCreateWorkflow(workflowKey: string): boolean {
  return getWorkflowType(workflowKey) === 'create';
}

/**
 * Checks if a workflow is an update workflow
 */
export function isUpdateWorkflow(workflowKey: string): boolean {
  return getWorkflowType(workflowKey) === 'update';
}

/**
 * Gets all workflows of a specific type
 */
export function getWorkflowsByType(type: WorkflowType): string[] {
  return Object.entries(WORKFLOW_TYPES)
    .filter(([_, workflowType]) => workflowType === type)
    .map(([key]) => key);
}
