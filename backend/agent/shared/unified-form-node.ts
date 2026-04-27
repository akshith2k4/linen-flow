/**
 * Unified Form Node
 * 
 * Single form node that handles all workflow domains (onboarding, orders, routes).
 * Replaces onboarding-form.ts, orders-form.ts, and routes-form.ts.
 * 
 * Domain-specific behavior is controlled via DomainConfig.
 */

import { IntentState } from "../state";
import workflows from "../workflows/index";
import {
  shouldSkipStep as shouldSkipStepShared,
  checkFormRecursionDepth
} from "./form-utils";
import { answerFormQuestion } from "./form-copilot";
import { fetchStepData } from "./form-hydration";
import {
  prepareSessionOptions,
  trackEntityInteraction,
  updateSessionContext
} from "./form-session";
import {
  resolveFormFields as resolveFormFieldsShared,
  createFieldRenderContext
} from "./form-field-renderers";
import {
  performAutoSkip as performAutoSkipShared,
  evaluateJumpDecision as evaluateJumpDecisionShared,
  NavigationContext
} from "./form-navigation";
import {
  getWorkflowType,
  isFieldMatch
} from "../../config/config-utils";

// ============================================================================
// DOMAIN CONFIGURATION
// ============================================================================

interface DomainConfig {
  prerequisiteField: string;
  entityTrackingType: 'hotel' | 'order' | 'route';
  hydrationStrategy: 'conditional' | 'always' | 'custom';
  customFetchHandler?: (stepConfig: any, data: any, authToken: string | undefined) => Promise<any>;
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  onboarding: {
    prerequisiteField: 'customer_id',
    entityTrackingType: 'hotel',
    hydrationStrategy: 'conditional'
  },
  orders: {
    prerequisiteField: 'order_id',
    entityTrackingType: 'hotel',
    hydrationStrategy: 'always'
  },
  routes: {
    prerequisiteField: 'route_id',
    entityTrackingType: 'route',
    hydrationStrategy: 'custom',
    customFetchHandler: undefined // Will be set after import
  }
};

// ============================================================================
// DOMAIN-SPECIFIC HELPERS
// ============================================================================

/**
 * Routes-specific: Fetch a single route by ID from the list endpoint.
 * GET /trips/routes/{id} returns 500 — fetch all and filter instead.
 */
async function fetchRouteByIdFromList(routeId: string | number): Promise<any | null> {
  try {
    const baseUrl = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
    const response = await fetch(`${baseUrl}/api/trips/routes`, {
      headers: {
        Authorization: `Bearer ${process.env.API_AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
    });
    if (response.ok) {
      const data: any = await response.json();
      const routes = Array.isArray(data) ? data : (data?.content || []);
      return routes.find((r: any) => String(r.id) === String(routeId)) || null;
    }
  } catch (e) {
    console.error(`❌ Failed to fetch route ${routeId}:`, e);
  }
  return null;
}

/**
 * Routes-specific: Custom fetch handler with route pre-fetch workaround
 */
async function fetchStepDataForRoutes(
  stepConfig: any,
  currentData: any,
  authToken: string | undefined
): Promise<any> {
  // Pre-fetch route data for pre-selection (GET by ID not supported, use list)
  if (!currentData.current_route_data && currentData.route_id) {
    const routeData = await fetchRouteByIdFromList(currentData.route_id);
    if (routeData) {
      currentData = { ...currentData, current_route_data: routeData };
      console.log(`✅ Pre-fetched route ${currentData.route_id} with ${routeData.points?.length || 0} existing points`);
    }
  }

  // Delegate to generic fetchStepData
  return fetchStepData(stepConfig, currentData, authToken);
}

// Set the custom fetch handler for routes
if (DOMAIN_CONFIGS.routes) {
  DOMAIN_CONFIGS.routes.customFetchHandler = fetchStepDataForRoutes;
}

/**
 * Orders-specific: Enrich multi-entry defaults with productName and string productId
 * This prepares data for frontend display (different from handler normalization)
 */
function enrichOrdersMultiEntry(stepForm: any, accumulatedData: any): any {
  if (!stepForm.multiple || !stepForm.list_key) return accumulatedData;

  const listData = accumulatedData[stepForm.list_key];
  if (!Array.isArray(listData) || listData.length === 0) return accumulatedData;

  const enrichedData = listData.map((item: any) => ({
    ...item,
    // Convert productId to string for dropdown matching
    productId: item.productId ? String(item.productId) : item.productId,
    productName: item.productName || item.product?.name || `Product ${item.productId}`
  }));

  console.log(`📋 Prepared ${enrichedData.length} defaults for ${stepForm.list_key}`);
  console.log(`📋 Sample item:`, JSON.stringify(enrichedData[0], null, 2));

  return {
    ...accumulatedData,
    [`${stepForm.list_key}_defaults`]: enrichedData
  };
}

/**
 * Generic: Prepare multi-entry defaults (simple list_key check)
 */
function prepareMultiEntryDefaults(
  stepForm: any,
  accumulatedData: any,
  entityType: string
): any {
  // Orders domain uses enriched version
  if (entityType === 'orders') {
    return enrichOrdersMultiEntry(stepForm, accumulatedData);
  }

  // Generic version for onboarding and routes
  if (!stepForm.multiple || !stepForm.list_key) return accumulatedData;
  const listData = accumulatedData[stepForm.list_key];
  if (!listData) return accumulatedData;

  return {
    ...accumulatedData,
    [`${stepForm.list_key}_defaults`]: listData
  };
}

// ============================================================================
// WORKFLOW & STEP CONTEXT HELPERS
// ============================================================================

interface WorkflowContext {
  selectedWorkflow: string;
  workflowType: 'create' | 'update' | 'delete' | 'unknown';
  isUpdateWorkflow: boolean;
  isCreateWorkflow: boolean;
  isNewWorkflowStart: boolean;
  currentStepNum: number;
  steps: any[];
}

interface StepContext {
  currentStepNum: number;
  currentStepConfig: any;
  steps: any[];
}

function getWorkflowContext(state: IntentState): WorkflowContext {
  const selectedWorkflow = state.entity_context?.active_workflow || "";
  const workflowType = getWorkflowType(selectedWorkflow);
  const currentStepNum = state.entity_context?.current_step || 1;

  return {
    selectedWorkflow,
    workflowType,
    isUpdateWorkflow: workflowType === 'update',
    isCreateWorkflow: workflowType === 'create',
    isNewWorkflowStart: currentStepNum === 1 && state.intent_plan?.status !== "correction",
    currentStepNum,
    steps: selectedWorkflow && workflows[selectedWorkflow as keyof typeof workflows]
      ? (workflows[selectedWorkflow as keyof typeof workflows] as any).steps
      : []
  };
}

function getStepContext(state: IntentState, workflowContext: WorkflowContext): StepContext {
  const { currentStepNum, steps } = workflowContext;
  const selectedWorkflowKey = state.entity_context?.active_workflow;

  // ALWAYS prioritize the actual workflow config over state cache
  let resolvedSteps = steps;
  if (selectedWorkflowKey && workflows[selectedWorkflowKey as keyof typeof workflows]) {
    resolvedSteps = (workflows[selectedWorkflowKey as keyof typeof workflows] as any).steps;
  } else {
    resolvedSteps = state.workflow_result?.steps || steps;
  }

  const currentStepConfig = resolvedSteps.find((s: any) => s.step === currentStepNum);

  return { currentStepNum, currentStepConfig, steps: resolvedSteps };
}

// ============================================================================
// MAIN UNIFIED FORM NODE
// ============================================================================

export const unifiedFormNode = async (
  state: IntentState,
  _recursionDepth: number = 0
): Promise<Partial<IntentState>> => {
  console.log("\n========================================");
  console.log("📝 UNIFIED FORM NODE STARTED");
  console.log("========================================");

  // Get domain config based on entity type
  const entityType = state.entity_context?.entity_type || "onboarding";
  const domainConfig = DOMAIN_CONFIGS[entityType];

  if (!domainConfig) {
    console.error(`❌ Unknown entity type: ${entityType}`);
    return {
      workflow_result: {
        ...state.workflow_result,
        message: "Configuration error: Unknown entity type."
      } as any
    };
  }

  console.log(`🎯 Domain: ${entityType}`);
  console.log(`   - Prerequisite field: ${domainConfig.prerequisiteField}`);
  console.log(`   - Hydration strategy: ${domainConfig.hydrationStrategy}`);

  // 1. EARLY FORM QUESTION CHECK
  if (state.intent_plan?.status === "form_question") {
    const stepContext = getStepContext(state, getWorkflowContext(state));
    const answer = await answerFormQuestion(state, stepContext.currentStepConfig);

    return {
      entity_context: {
        ...(state.entity_context as any),
        message: answer
      },
      workflow_result: {
        ...state.workflow_result,
        selected_workflow: state.workflow_result?.selected_workflow || null,
        currentstep: stepContext.currentStepNum,
        message: answer
      } as any,
      intent_plan: {
        ...state.intent_plan,
        status: "workflow_selected"
      }
    };
  }

  // 2. CHECK RECURSION DEPTH
  const recursionError = checkFormRecursionDepth(state, _recursionDepth);
  if (recursionError) return recursionError;

  try {
    // 3. GET WORKFLOW CONTEXT
    const workflowContext = getWorkflowContext(state);
    const stepContext = getStepContext(state, workflowContext);
    const { currentStepNum, currentStepConfig, steps } = stepContext;

    if (!currentStepConfig || !currentStepConfig.form) return {};

    // 4. MERGE ACCUMULATED_DATA + USER_DATA
    let finalAccumulatedData = {
      ...state.accumulated_data,
      ...state.user_data
    };

    console.log(`🔒 FORM NODE: Workflow start check`);
    console.log(`   - isNewWorkflowStart: ${workflowContext.isNewWorkflowStart}`);
    console.log(`   - isCreateWorkflow: ${workflowContext.isCreateWorkflow}`);
    console.log(`   - isUpdateWorkflow: ${workflowContext.isUpdateWorkflow}`);

    // 5. PREPARE SESSION OPTIONS (Step 1 only)
    finalAccumulatedData = prepareSessionOptions(
      currentStepConfig,
      { ...workflowContext, currentStepNum },
      finalAccumulatedData,
      state.session_context
    );

    // 6. FETCH STEP DATA (HYDRATION) - Domain-specific strategy
    const shouldHydrate =
      domainConfig.hydrationStrategy === 'always' ||
      (domainConfig.hydrationStrategy === 'conditional' &&
        !(workflowContext.isCreateWorkflow && workflowContext.isNewWorkflowStart));

    if (domainConfig.hydrationStrategy === 'custom' && domainConfig.customFetchHandler) {
      console.log(`🔄 FORM NODE: Running custom hydration for ${entityType}`);
      finalAccumulatedData = await domainConfig.customFetchHandler(
        currentStepConfig,
        finalAccumulatedData,
        process.env.API_AUTH_TOKEN
      );
    } else if (shouldHydrate) {
      console.log(`🔄 FORM NODE: Running hydration for ${workflowContext.isUpdateWorkflow ? 'UPDATE' : 'existing'} workflow`);
      finalAccumulatedData = await fetchStepData(
        currentStepConfig,
        finalAccumulatedData,
        process.env.API_AUTH_TOKEN
      );
    } else {
      console.log(`🔒 FORM NODE: Skipping hydration for CREATE workflow (keeping clean data)`);
    }

    // 7. TRACK ENTITY INTERACTION
    finalAccumulatedData = trackEntityInteraction(
      workflowContext,
      finalAccumulatedData,
      state.session_context,
      domainConfig.entityTrackingType
    );

    const stepForm = currentStepConfig.form as any;
    const fieldsToUpdate = state.intent_plan?.fields_to_update || [];
    const targetStepFromOrchestrator = state.intent_plan?.target_step ?? null;

    const currentStepContainsRequestedFields = currentStepConfig.form?.fields?.some((f: any) =>
      fieldsToUpdate.some(req => isFieldMatch(req, f.name))
    );
    const isRequestingThisStep = currentStepContainsRequestedFields ||
      fieldsToUpdate.some(req => isFieldMatch(req, currentStepConfig.title || ""));

    const isCorrectionMode = state.intent_plan?.status === "correction" || isRequestingThisStep;

    // 8. CHECK SKIP CONDITIONS
    if (shouldSkipStepShared(currentStepConfig, finalAccumulatedData)) {
      return {
        accumulated_data: finalAccumulatedData,
        user_data: {},
        entity_context: {
          ...(state.entity_context as any),
          current_step: currentStepNum + 1
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: currentStepNum + 1
        } as any
      };
    }

    // 9. AUTO-SKIP LOGIC
    const navContext: NavigationContext = {
      selectedWorkflow: workflowContext.selectedWorkflow,
      workflowType: workflowContext.workflowType,
      isUpdateWorkflow: workflowContext.isUpdateWorkflow,
      isCreateWorkflow: workflowContext.isCreateWorkflow,
      isNewWorkflowStart: workflowContext.isNewWorkflowStart,
      currentStepNum,
      steps
    };

    const autoSkipResult = performAutoSkipShared(
      currentStepNum,
      currentStepConfig,
      steps,
      finalAccumulatedData,
      navContext,
      isCorrectionMode,
      workflows
    );

    if (autoSkipResult.finalStepNum !== currentStepNum) {
      let skipMessage = state.entity_context?.message || state.workflow_result?.message || `Moving forward to **${autoSkipResult.finalStepConfig.title}**.`;
      if (skipMessage.includes("Next up is") || autoSkipResult.didAutoSkip) {
        skipMessage = `Great! Next up is **${autoSkipResult.finalStepConfig.title}**. Please fill in the details below.`;
      }

      return await unifiedFormNode({
        ...state,
        entity_context: {
          ...(state.entity_context as any),
          current_step: autoSkipResult.finalStepNum,
          message: skipMessage
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: autoSkipResult.finalStepNum,
          message: skipMessage
        } as any
      }, _recursionDepth + 1);
    }

    // 10. JUMP DECISION EVALUATION
    const jumpDecision = evaluateJumpDecisionShared(
      state,
      navContext,
      fieldsToUpdate,
      targetStepFromOrchestrator,
      isCorrectionMode,
      finalAccumulatedData,
      domainConfig.prerequisiteField
    );

    if (jumpDecision.shouldJump && jumpDecision.redirectStepNum) {
      const correctStepTitle = steps.find((s: any) => s.step === jumpDecision.redirectStepNum)?.title;
      return await unifiedFormNode({
        ...state,
        accumulated_data: finalAccumulatedData,
        intent_plan: {
          ...state.intent_plan,
          target_step: jumpDecision.redirectStepNum,
          status: "correction"
        },
        entity_context: {
          ...(state.entity_context as any),
          current_step: jumpDecision.redirectStepNum,
          message: `Let's start with **${correctStepTitle}** first.`
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: jumpDecision.redirectStepNum,
          message: `Let's start with **${correctStepTitle}** first.`
        } as any
      }, _recursionDepth + 1);
    }

    if (jumpDecision.blockedByPrerequisite && jumpDecision.redirectStepNum &&
      jumpDecision.redirectStepNum !== currentStepNum) {
      return await unifiedFormNode({
        ...state,
        accumulated_data: finalAccumulatedData,
        intent_plan: { ...state.intent_plan },
        entity_context: {
          ...(state.entity_context as any),
          current_step: jumpDecision.redirectStepNum,
          message: `I need a bit more info first. Let's start with **${steps.find((s: any) => s.step === jumpDecision.redirectStepNum)?.title || 'this step'}**.`
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: jumpDecision.redirectStepNum,
          message: `I need a bit more info first. Let's start with **${steps.find((s: any) => s.step === jumpDecision.redirectStepNum)?.title || 'this step'}**.`
        } as any
      }, _recursionDepth + 1);
    }

    if (jumpDecision.shouldJump && jumpDecision.targetStepNum &&
      jumpDecision.targetStepNum !== currentStepNum && !jumpDecision.blockedByPrerequisite) {
      return await unifiedFormNode({
        ...state,
        accumulated_data: finalAccumulatedData,
        intent_plan: { ...state.intent_plan },
        entity_context: {
          ...(state.entity_context as any),
          current_step: jumpDecision.targetStepNum,
          message: `Sure, I've jumped to **${jumpDecision.targetStepConfig.title}** so you can update those details.`
        },
        workflow_result: {
          ...state.workflow_result,
          currentstep: jumpDecision.targetStepNum,
          message: `Sure, I've jumped to **${jumpDecision.targetStepConfig.title}** so you can update those details.`
        } as any
      }, _recursionDepth + 1);
    }

    // 11. RESOLVE FORM FIELDS
    const renderContext = createFieldRenderContext(
      workflowContext,
      finalAccumulatedData,
      finalAccumulatedData.current_route_data // For routes dual_multi_select
    );
    const resolvedFields = resolveFormFieldsShared(
      stepForm?.fields || [],
      finalAccumulatedData,
      renderContext
    );

    // 12. PREPARE MULTI-ENTRY DEFAULTS
    finalAccumulatedData = prepareMultiEntryDefaults(stepForm, finalAccumulatedData, entityType);

    // 13. UPDATE SESSION CONTEXT
    const sessionUpdate = updateSessionContext(state, finalAccumulatedData);
    finalAccumulatedData = sessionUpdate.cleanAccumulatedData;
    const resolvedSessionContext = sessionUpdate.sessionContext;

    // 14. BUILD FORM RESULT
    const message = currentStepConfig.description || `Please fill in the ${currentStepConfig.title} details.`;

    return {
      accumulated_data: finalAccumulatedData,
      user_data: {},
      form_schema: {
        accumulated_data: finalAccumulatedData,
        form: {
          title: currentStepConfig.title,
          description: currentStepConfig.description,
          type: stepForm.type || "standard",
          fields: resolvedFields,
          multiple: stepForm.multiple,
          list_key: stepForm.list_key,
          min_entries: stepForm.min_entries,
          add_label: stepForm.add_label,
          current_step: currentStepNum,
          total_steps: steps.length,
          layout: currentStepConfig.layout,
          submit: {
            label: currentStepNum >= steps.length ? "Complete" : currentStepConfig.api ? "Submit & Save" : "Next Step"
          }
        }
      },
      workflow_result: {
        ...state.workflow_result,
        currentstep: currentStepNum,
        message,
        ui_data: null,
        widget_id: null
      } as any,
      entity_context: {
        ...(state.entity_context as any),
        current_step: currentStepNum,
        message
      },
      intent_plan: { ...state.intent_plan },
      session_context: resolvedSessionContext
    };

  } catch (error) {
    console.error("Unified form node error:", error);
    return {};
  }
};
