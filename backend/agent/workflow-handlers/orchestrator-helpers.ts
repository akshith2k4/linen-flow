/**
 * Orchestrator Helper Functions
 * 
 * Extracted utilities from unified-api-node to improve readability and testability.
 * Each function has a single, clear responsibility.
 */

import { IntentState } from "../state";
import workflows from "../workflows/index";
import { resolveStepContracts } from "../shared/contract-resolver";
import { resolvePath } from "../shared/payload-utils";
import { getTransitionButtons } from "../../config/workflow-transitions";

/**
 * Extracts workflow context from state
 */
export function extractWorkflowContext(state: IntentState): {
  selectedWorkflow: string;
  currentStepNum: number;
} {
  return {
    currentStepNum: Number(state.entity_context?.current_step || 1),
    selectedWorkflow: state.entity_context?.active_workflow || "",
  };
}

/**
 * Resolves step configuration with contract resolution
 */
export function resolveStepConfig(
  selectedWorkflow: string,
  currentStepNum: number
): {
  steps: any[];
  currentStepConfig: any;
  isLastStep: boolean;
} {
  let steps: any[] = [];
  if (selectedWorkflow && workflows[selectedWorkflow as keyof typeof workflows]) {
    steps = (workflows[selectedWorkflow as keyof typeof workflows] as any).steps;
  }

  const rawStepConfig = steps.find((s: any) => s.step === currentStepNum);
  const currentStepConfig = resolveStepContracts(rawStepConfig);
  const isLastStep = currentStepNum >= steps.length;

  return { steps, currentStepConfig, isLastStep };
}

/**
 * Resolves dynamic endpoint parameters (e.g., {{customer_id}})
 */
export function resolveEndpoint(endpoint: string, data: any): string {
  let resolved = endpoint;
  const matches = endpoint.match(/\{\{([^}]+)\}\}/g);
  
  if (matches) {
    for (const match of matches) {
      const path = match.slice(2, -2);
      const val = resolvePath(data, path);
      resolved = resolved.replace(match, val !== undefined ? String(val) : "");
    }
  }
  
  return resolved;
}

/**
 * Builds the completion state when a workflow finishes
 */
export function buildCompletionState(
  state: IntentState,
  selectedWorkflow: string,
  currentStepNum: number,
  updatedSharedData: Record<string, any>,
  mergedSessionContext: any,
  shouldKillWorkflow: boolean,
  message: string
): Partial<IntentState> {
  return {
    accumulated_data: {
      _reset: true,
      just_completed: true,
      completed_workflow_name: state.workflow_result?.workflow_name || selectedWorkflow,
    },
    user_data: {},
    form_schema: null,
    session_context: mergedSessionContext,
    intent_plan: {
      ...state.intent_plan,
      status: "classified",
      fields_to_update: [],
      target_step: undefined,
      workflow: shouldKillWorkflow ? "" : state.intent_plan?.workflow,
      entity: shouldKillWorkflow ? "" : state.intent_plan?.entity,
      type: shouldKillWorkflow ? "" : state.intent_plan?.type,
    },
    workflow_result: {
      ...state.workflow_result,
      selected_workflow: shouldKillWorkflow ? null : selectedWorkflow,
      currentstep: shouldKillWorkflow ? 0 : currentStepNum,
      message,
      quick_actions: getTransitionButtons(selectedWorkflow).map((btn) => ({
        label: btn.label,
        action: `I want to ${btn.workflow.replace(/_/g, " ")}`,
      })),
    } as any,
    entity_context: {
      ...(state.entity_context as any),
      active_workflow: shouldKillWorkflow ? null : selectedWorkflow,
      current_step: shouldKillWorkflow ? 0 : currentStepNum,
      shared_data: shouldKillWorkflow ? {} : updatedSharedData,
      message,
    },
  };
}

/**
 * Field display names for user-friendly success messages
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  "name": "hotel name",
  "phone": "phone number",
  "email": "email address",
  "type": "customer type",
  "status": "status",
  "code": "customer code",
  "gstin": "GSTIN",
  "pan": "PAN",
  "contactPersons": "contact persons",
  "billingAddress": "billing address",
  "shippingAddress": "shipping address",
  "agreement_type": "agreement type",
  "start_date": "start date",
  "end_date": "end date",
  "total_rooms": "total rooms",
  "occupancy_rate": "occupancy rate",
  "deposit_amount": "deposit amount",
  "service_frequency": "service frequency",
  "linen_delivery_days": "linen delivery days",
  "products": "products and services",
  "billing_type": "billing type",
  "credit_days": "credit days",
  "billing_cycle": "billing cycle",
  "discount_percentage": "discount percentage",
  "fixed_monthly_amount": "fixed monthly amount",
  "laundryVendorId": "laundry vendor",
  "poolId": "inventory pool",
  "washRequestType": "wash type",
  "plannedWashTime": "planned wash time",
  "washRequestRecordedDateTime": "recorded date/time",
  "productSoiledItems": "products and soiled quantities",
  "routeId": "route",
  "deliveryDate": "delivery date",
  "tripType": "trip type",
  "vehicleId": "vehicle",
  "assignedPeople": "assigned crew",
  "notes": "notes",
};

export function getDisplayName(field: string): string {
  return FIELD_DISPLAY_NAMES[field] || field.replace(/_/g, " ");
}
