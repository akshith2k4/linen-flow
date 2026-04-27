import { IntentState } from "../state";
import workflows from "../workflows/index";
import { sanitizeSharedData } from "../shared/shared-data-utils";
import { fetchWithRetry, triggerFetchCurrentData } from "../shared/api-utils";
import { sanitizeResult } from "../shared/payload-utils";
import { resolveStepContracts } from "../shared/contract-resolver";
import { getTransitionButtons } from "../../config/workflow-transitions";
import { trackSessionContext } from "../../config/config-utils";
import { WORKFLOW_HANDLERS } from "./index";
import { isValidatable, isFilterable, isSkippable } from "./types";
import { decideCompletion, shouldKeepIntentPlan } from "./completion-logic";
import { 
  extractWorkflowContext, 
  resolveStepConfig, 
  resolveEndpoint, 
  buildCompletionState,
  getDisplayName 
} from "./orchestrator-helpers";

// ============================================================================
// UNIFIED API NODE - Handles all workflows through handler registry
// ============================================================================

/**
 * Unified API node that processes all workflow API calls.
 * Domain logic is delegated to workflow handlers in the registry.
 * This node provides pure scaffolding: read config, merge data, call handler,
 * validate, POST to API, extract IDs, track session, advance workflow.
 */
export const unifiedApiNode = async (state: IntentState): Promise<Partial<IntentState>> => {
  console.log("\n========================================");
  console.log("🚀 UNIFIED API NODE STARTED");
  console.log("========================================");
  
  // 1. Extract workflow context from state
  const { selectedWorkflow, currentStepNum } = extractWorkflowContext(state);
  
  console.log("📥 Current workflow (entity_context):", selectedWorkflow);
  console.log("📥 Current step (entity_context):", currentStepNum);

  // Get workflow steps and configuration
  const { steps, currentStepConfig, isLastStep } = resolveStepConfig(selectedWorkflow, currentStepNum);

  // 2. Merge accumulated_data + user_data
  let newAccumulatedData = { ...state.accumulated_data, ...state.user_data };

  // 3. Fetch current data if step config requires it
  if (currentStepConfig?.fetch_current_data) {
    const fetchConfigs = Array.isArray(currentStepConfig.fetch_current_data)
      ? currentStepConfig.fetch_current_data
      : [currentStepConfig.fetch_current_data];
    
    for (const config of fetchConfigs) {
      newAccumulatedData = await triggerFetchCurrentData(
        { fetch_current_data: config },
        newAccumulatedData,
        process.env.API_AUTH_TOKEN
      );
    }
  }

  // 4. Determine which API to call (Step API or Workflow API)
  let apiConfig = currentStepConfig?.api;

  // Fallback to top-level API if this is the last step and no step API is defined
  if (!apiConfig && isLastStep) {
    const rawWorkflowConfig = workflows[selectedWorkflow as keyof typeof workflows];
    if (rawWorkflowConfig && (rawWorkflowConfig as any).api) {
      const resolvedWorkflow = resolveStepContracts(rawWorkflowConfig);
      apiConfig = resolvedWorkflow.api;
      console.log(`📡 Falling back to top-level API for workflow: ${selectedWorkflow}`);
    }
  }

  if (apiConfig) {
    const { endpoint, method, headers = {} } = apiConfig as {
      endpoint: string;
      method: string;
      headers?: Record<string, string>;
    };

    // Resolve dynamic endpoint params using helper
    const resolvedEndpoint = resolveEndpoint(endpoint, newAccumulatedData);

    console.log(`🚀 API Detected for Step ${currentStepNum}: ${method} ${resolvedEndpoint}`);

    // 5. Get handler from registry
    const handler = WORKFLOW_HANDLERS[selectedWorkflow as keyof typeof WORKFLOW_HANDLERS];
    
    if (!handler) {
      const msg = `Configuration error: No handler registered for workflow "${selectedWorkflow}".`;
      console.error(`❌ ${msg}`);
      return {
        form_schema: null,
        workflow_result: { ...state.workflow_result, message: msg } as any,
        entity_context: { ...(state.entity_context as any), message: msg },
        session_context: state.session_context,
      };
    }

    console.log(`🧠 Using Workflow Handler for: ${selectedWorkflow}`);

    // 6. handler.buildPayload() → payload (with error boundary)
    let payload: any;
    try {
      payload = handler.buildPayload(newAccumulatedData);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const msg = `Failed to prepare data for ${selectedWorkflow}: ${errorMsg}`;
      console.error(`❌ buildPayload failed:`, e);
      return {
        form_schema: null,
        accumulated_data: newAccumulatedData,
        user_data: {},
        workflow_result: { ...state.workflow_result, message: msg } as any,
        entity_context: { ...(state.entity_context as any), message: msg },
        session_context: state.session_context,
      };
    }

    // 7. Check if API call should be skipped (using type guard)
    if (isSkippable(handler) && handler.shouldSkipApi(payload, newAccumulatedData)) {
      const msg = handler.getSkipMessage(payload, newAccumulatedData);
      
      console.log(`⏭️ Skipping API call: ${msg}`);
      
      return {
        accumulated_data: { _reset: true, just_completed: true, completed_workflow_name: selectedWorkflow },
        user_data: {},
        form_schema: null,
        intent_plan: { 
          ...state.intent_plan, 
          status: "classified", 
          fields_to_update: [], 
          target_step: undefined, 
          workflow: "", 
          entity: "", 
          type: "" 
        },
        workflow_result: { 
          ...state.workflow_result, 
          selected_workflow: null, 
          currentstep: 0, 
          message: msg 
        } as any,
        entity_context: { 
          ...(state.entity_context as any), 
          active_workflow: null, 
          current_step: 0, 
          message: msg 
        },
      };
    }

    // 8. Validate payload if handler supports validation (using type guard)
    if (isValidatable(handler)) {
      const validation = handler.validatePayload(payload);
      if (!validation.success) {
        const msg = `Invalid data for ${selectedWorkflow}:\n\n${validation.errors?.join("\n")}`;
        console.error(`❌ Validation failed:`, validation.errors);
        return {
          form_schema: null,
          accumulated_data: newAccumulatedData,
          user_data: {},
          workflow_result: { ...state.workflow_result, message: msg } as any,
          entity_context: { ...(state.entity_context as any), message: msg },
          session_context: state.session_context,
        };
      }
      payload = validation.data;
    }

    // Apply filterItems if handler supports it (using type guard)
    if (isFilterable(handler)) {
      for (const [key, value] of Object.entries(payload)) {
        const filtered = handler.filterItems(key, value, payload);
        if (filtered !== undefined) payload[key] = filtered;
      }
    }

    console.log(`📦 Final payload being sent to API:`, JSON.stringify(payload, null, 2));

    // 9. POST to API
    try {
      const result = await fetchWithRetry(
        resolvedEndpoint,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(process.env.API_AUTH_TOKEN ? { "Authorization": `Bearer ${process.env.API_AUTH_TOKEN}` } : {}),
            ...headers,
          },
          body: JSON.stringify(payload)
        },
        { maxAttempts: 3, baseDelayMs: 500, timeoutMs: 15000 }
      );

      console.log(`✅ API Response received:`, JSON.stringify(result, null, 2));

      // 10. handler.handleResponse() → extract shared IDs
      const sanitizedResult = sanitizeResult(result);
      const enrichedData = {
        ...newAccumulatedData,
        [`${selectedWorkflow}_result`]: sanitizedResult,
      };

      // Shared Data Injection - Use centralized sanitization utility
      const previousSharedData = state.entity_context?.shared_data || {};
      const entityType = state.entity_context?.entity_type || "onboarding";
      const updatedSharedData = sanitizeSharedData(previousSharedData, entityType);
      
      // Single source of truth: handler.handleResponse() extracts all shared IDs
      const { sharedIds } = handler.handleResponse(result);
      Object.assign(updatedSharedData, sharedIds);

      // 11. Track session context
      const sessionContextUpdate = trackSessionContext(
        selectedWorkflow,
        result,
        newAccumulatedData,
        state.session_context
      );

      const mergedSessionContext = {
        ...state.session_context,
        ...(Object.keys(sessionContextUpdate).length > 0 ? sessionContextUpdate : {})
      };

      // 12. Decide workflow completion using centralized logic
      const isUpdateWorkflow = selectedWorkflow.startsWith("update_");
      const fieldsToUpdate = state.intent_plan?.fields_to_update || [];
      const targetStepFromOrchestrator = state.intent_plan?.target_step;
      
      const decision = decideCompletion(
        isLastStep,
        selectedWorkflow,
        fieldsToUpdate,
        targetStepFromOrchestrator,
        currentStepNum
      );
      
      console.log(`🎯 Completion decision: ${decision.action} - ${decision.reason}`);
      
      if (decision.action === "kill_workflow" || (isLastStep && decision.action !== "advance")) {
        const message = decision.action === "kill_workflow" && isLastStep && fieldsToUpdate.length === 0
          ? `✅ ${state.workflow_result?.workflow_name || "Workflow"} has been successfully completed! Generating next steps...`
          : fieldsToUpdate.length > 0
            ? `✅ Updated ${fieldsToUpdate.map(f => getDisplayName(f)).join(", ")} successfully. What would you like to do next?`
            : `✅ Updated successfully. What would you like to do next?`;

        const shouldKillWorkflow = decision.action === "kill_workflow";
        
        return buildCompletionState(
          state,
          selectedWorkflow,
          currentStepNum,
          updatedSharedData,
          mergedSessionContext,
          shouldKillWorkflow,
          message
        );
      }

      // More steps remaining → advance to next step
      const shouldKeepIntent = shouldKeepIntentPlan(isUpdateWorkflow, targetStepFromOrchestrator, currentStepNum);
      const nextStepConfig = steps.find((s: any) => s.step === currentStepNum + 1);
      const nextStepName = nextStepConfig?.title || `Step ${currentStepNum + 1}`;
      const msg = `Perfect! Let's move on to the **${nextStepName}** to keep the process moving.`;

      return {
        accumulated_data: enrichedData,
        user_data: {},
        form_schema: null,
        session_context: mergedSessionContext,
        intent_plan: {
          ...state.intent_plan,
          status: "classified",
          fields_to_update: shouldKeepIntent ? fieldsToUpdate : [],
          target_step: shouldKeepIntent ? targetStepFromOrchestrator : undefined
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: currentStepNum + 1,
          message: msg,
        } as any,
        entity_context: {
          ...(state.entity_context as any),
          current_step: currentStepNum + 1,
          shared_data: updatedSharedData,
          message: msg
        }
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("❌ API call failed:", errorMsg);
      
      let msg: string;
      if (errorMsg.toLowerCase().includes("already exists")) {
        msg = "⚠️ Some of the data already exists. Please check your selections and try again.";
      } else if (errorMsg.includes("ERR_TLS_CERT") || errorMsg.includes("certificate")) {
        msg = "⚠️ Cannot reach the server right now (TLS/certificate issue). Please try again later or contact support.";
      } else if (errorMsg.includes("500")) {
        msg = "⚠️ The server encountered an error. Please check your data and try again.";
      } else {
        msg = "⚠️ System error during API call. Please try again.";
      }
      
      return {
        form_schema: null,
        accumulated_data: newAccumulatedData,
        user_data: {},
        workflow_result: { ...state.workflow_result, message: msg } as any,
        entity_context: { ...(state.entity_context as any), message: msg },
        session_context: state.session_context,
      };
    }
  }

  // No API on this step — just advance
  if (isLastStep) {
    const msg = `✅ ${state.workflow_result?.workflow_name || "Workflow"} has been successfully completed. Generating next steps...`;
    return {
      accumulated_data: {
        ...newAccumulatedData,
        just_completed: true,
        completed_workflow_name: state.workflow_result?.workflow_name || selectedWorkflow
      },
      user_data: {},
      form_schema: null,
      workflow_result: {
        ...state.workflow_result,
        selected_workflow: null,
        currentstep: currentStepNum,
        message: msg,
        quick_actions: getTransitionButtons(selectedWorkflow).map(btn => ({
          label: btn.label,
          action: `I want to ${btn.workflow.replace(/_/g, ' ')}`
        }))
      } as any,
      entity_context: {
        ...(state.entity_context as any),
        active_workflow: null,
        current_step: 0,
        message: msg
      },
      session_context: state.session_context,
    };
  }

  const nextStepConfig = steps.find((s: any) => s.step === currentStepNum + 1);
  const nextStepName = nextStepConfig?.title || `Step ${currentStepNum + 1}`;
  const msg = `Great! Next up is the **${nextStepName}**. Please fill in the details below.`;

  const targetStep = state.intent_plan?.target_step;
  const hasCompletedCorrection = targetStep && currentStepNum >= targetStep;

  return {
    accumulated_data: newAccumulatedData,
    user_data: {},
    intent_plan: hasCompletedCorrection ? {
      ...state.intent_plan,
      fields_to_update: [],
      target_step: undefined,
      status: "workflow_selected"
    } : state.intent_plan,
    workflow_result: {
      ...state.workflow_result,
      currentstep: currentStepNum + 1,
      message: msg,
    } as any,
    entity_context: {
      ...(state.entity_context as any),
      current_step: currentStepNum + 1,
      message: msg
    },
    session_context: state.session_context,
  };
};
