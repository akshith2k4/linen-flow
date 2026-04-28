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
  },
  wash: {
    prerequisiteField: 'dcId',
    entityTrackingType: 'route',
    hydrationStrategy: 'conditional'
  },
  trips: {
    prerequisiteField: 'dcId',
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
 * Wash-specific: Fetch soiled quantities from the API and pre-fill productSoiledItems.
 * Uses poolId + vendorId + deliveryDate (defaults to today).
 */
async function fetchStepDataForWash(
  stepConfig: any,
  currentData: any,
  authToken: string | undefined
): Promise<any> {
  // Run generic fetch for standard fetch_current_data (GET_VENDORS, GET_POOLS, etc.)
  let data = await fetchStepData(stepConfig, currentData, authToken);

  // For Step 5 (productSoiledItems), auto-fetch soiled quantities
  const hasProductField = stepConfig.field_names?.includes('productSoiledItems');
  if (hasProductField && !data.productSoiledItems_defaults) {
    const poolId = data.poolId;
    const vendorId = data.laundryVendorId;
    const deliveryDate = data.deliveryDate || new Date().toISOString().split('T')[0];

    if (poolId && vendorId) {
      try {
        const baseUrl = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
        const url = `${baseUrl}/api/soiled-inventory/soiled-quantities?poolId=${poolId}&vendorId=${vendorId}&deliveryDate=${deliveryDate}`;
        console.log(`🔍 Fetching soiled quantities: ${url}`);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "x-company-id": "1",
          },
        });

        if (response.ok) {
          const soiledData = await response.json();
          const items = Array.isArray(soiledData) ? soiledData : [];
          const productSoiledItems = items
            .filter((item: any) => item.productId != null)
            .map((item: any) => ({
              productId: String(item.productId),
              productName: item.productName || `Product ${item.productId}`,
              soiledQuantity: item.soiledQuantity ?? 0,
              heavySoiledQuantity: item.heavySoiledQuantity ?? 0,
            }));

          data = { ...data, productSoiledItems_defaults: productSoiledItems };
          console.log(`✅ Auto-populated ${productSoiledItems.length} soiled items for pool ${poolId}, vendor ${vendorId}, date ${deliveryDate}`);
        } else {
          console.warn(`⚠️ Soiled quantities API returned ${response.status}`);
        }
      } catch (e) {
        console.error(`❌ Failed to fetch soiled quantities:`, e);
      }
    } else {
      console.warn(`⚠️ Missing poolId (${poolId}) or vendorId (${vendorId}) for soiled quantities fetch`);
    }
  }

  return data;
}

// Set the custom fetch handler for wash
if (DOMAIN_CONFIGS.wash) {
  DOMAIN_CONFIGS.wash.customFetchHandler = fetchStepDataForWash;
}

/**
 * Trips-specific: Fetch routes, vehicles, users, and auto-build visitRequests
 * from scheduled-tasks/by-date based on route points + delivery date.
 */
async function fetchStepDataForTrips(
  stepConfig: any,
  currentData: any,
  authToken: string | undefined
): Promise<any> {
  let data = await fetchStepData(stepConfig, currentData, authToken);

  const baseUrl = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    "x-company-id": "1",
  };

  // ── Step 2: Fetch routes filtered by dcId ──
  if (stepConfig.field_names?.includes('routeId') && !data.available_routes) {
    const dcId = data.dcId;
    if (dcId) {
      try {
        console.log(`🔍 [Trips] Fetching routes for dcId=${dcId}`);
        const resp = await fetch(`${baseUrl}/api/trips/routes?dcId=${dcId}`, { headers });
        if (resp.ok) {
          const raw = await resp.json();
          const routes = Array.isArray(raw) ? raw : (raw?.content || []);
          data = { ...data, available_routes: routes };
          console.log(`✅ [Trips] Loaded ${routes.length} routes`);
        }
      } catch (e) {
        console.error(`❌ [Trips] Failed to fetch routes:`, e);
      }
    }
  }

  // ── Step 3: Fetch vehicles ──
  if (stepConfig.field_names?.includes('vehicleId') && !data.available_vehicles) {
    const dcId = data.dcId;
    if (dcId) {
      try {
        console.log(`🔍 [Trips] Fetching vehicles for dcId=${dcId}`);
        const resp = await fetch(`${baseUrl}/api/trips/vehicles/branch/1?dcId=${dcId}`, { headers });
        if (resp.ok) {
          const raw = await resp.json();
          const vehicles = Array.isArray(raw) ? raw : (raw?.content || []);
          data = { ...data, available_vehicles: vehicles };
          console.log(`✅ [Trips] Loaded ${vehicles.length} vehicles`);
        }
      } catch (e) {
        console.error(`❌ [Trips] Failed to fetch vehicles:`, e);
      }
    }
  }

  // ── Step 4: Fetch users, fetch route points, build visitRequests ──
  if (stepConfig.field_names?.includes('assignedPeople')) {
    // 4a. Fetch users for dropdown
    if (!data.available_users) {
      try {
        console.log(`🔍 [Trips] Fetching active users`);
        const resp = await fetch(`${baseUrl}/api/users/active?branchId=1`, { headers });
        if (resp.ok) {
          const raw = await resp.json();
          const users = Array.isArray(raw) ? raw : (raw?.content || []);
          data = { ...data, available_users: users };
          console.log(`✅ [Trips] Loaded ${users.length} users`);
        }
      } catch (e) {
        console.error(`❌ [Trips] Failed to fetch users:`, e);
      }
    }

    // 4b. Always fetch fresh route points (don't rely on accumulated data)
    let routePoints = data.route_points;
    if ((!routePoints || routePoints.length === 0) && data.routeId && data.dcId) {
      try {
        console.log(`🔍 [Trips] Fetching route points for routeId=${data.routeId}, dcId=${data.dcId}`);
        const resp = await fetch(`${baseUrl}/api/trips/routes?dcId=${data.dcId}`, { headers });
        if (resp.ok) {
          const raw = await resp.json();
          const routes = Array.isArray(raw) ? raw : (raw?.content || []);
          const selected = routes.find((r: any) => String(r.id) === String(data.routeId));
          if (selected) {
            // API returns 'points' not 'routePoints'
            routePoints = selected.points || [];
            data = { ...data, route_points: routePoints, routeName: selected.name || data.routeName || "" };
            console.log(`✅ [Trips] Route "${selected.name}" has ${routePoints.length} points`);
          }
        }
      } catch (e) {
        console.error(`❌ [Trips] Failed to fetch route details:`, e);
      }
    }

    // 4c. Auto-build visitRequests from scheduled-tasks
    const deliveryDate = data.deliveryDate;
    console.log(`🔍 [Trips] Visit request check: routePoints=${routePoints?.length || 0}, deliveryDate=${deliveryDate}, existing=${!!data.visitRequests}`);

    if (!data.visitRequests && routePoints && routePoints.length > 0 && deliveryDate) {
      const customerIds = routePoints
        .filter((p: any) => p.partyType === "CUSTOMER")
        .map((p: any) => p.partyId);
      const vendorIds = routePoints
        .filter((p: any) => p.partyType === "LAUNDRY_VENDOR" || p.partyType === "VENDOR")
        .map((p: any) => p.partyId);

      console.log(`🔍 [Trips] Extracted from route: ${customerIds.length} customers, ${vendorIds.length} vendors`);

      if (customerIds.length > 0 || vendorIds.length > 0) {
        try {
          const requestBody = {
            customerIds,
            vendorIds,
            date: deliveryDate,
            dcId: Number(data.dcId),
          };
          console.log(`🔍 [Trips] Calling scheduled-tasks/by-date:`, JSON.stringify(requestBody));
          
          const resp = await fetch(`${baseUrl}/api/trips/scheduled-tasks/by-date`, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
          });

          if (resp.ok) {
            const tasksRaw = await resp.json();
            const tasksList: any[] = Array.isArray(tasksRaw) ? tasksRaw : [];
            console.log(`🔍 [Trips] Received ${tasksList.length} tasks from scheduled-tasks`);
            
            const visitRequests = buildVisitRequestsFromTasks(tasksList, routePoints);
            data = { ...data, visitRequests };
            console.log(`✅ [Trips] Built ${visitRequests.length} visit requests`);
            
            if (visitRequests.length > 0) {
              console.log(`✅ [Trips] Sample visit:`, JSON.stringify(visitRequests[0]));
            }
          } else {
            console.warn(`⚠️ [Trips] Scheduled tasks API returned ${resp.status}`);
          }
        } catch (e) {
          console.error(`❌ [Trips] Failed to fetch scheduled tasks:`, e);
        }
      } else {
        console.log(`ℹ️ [Trips] No customers or vendors on route`);
      }
    } else if (!deliveryDate) {
      console.warn(`⚠️ [Trips] No deliveryDate in accumulated data`);
    } else if (!routePoints || routePoints.length === 0) {
      console.warn(`⚠️ [Trips] No route points available`);
    }
  }

  return data;
}

/**
 * Groups scheduled tasks by partyId and builds visitRequests in route point order.
 * Handles DELIVERY, PICKUP, and BOTH leasingOrderTypes.
 */
function buildVisitRequestsFromTasks(tasks: any[], routePoints: any[]): any[] {
  const grouped = new Map<number, any[]>();
  for (const task of tasks) {
    const partyId = task.partyId;
    if (!grouped.has(partyId)) grouped.set(partyId, []);
    grouped.get(partyId)!.push(task);
  }

  console.log(`🔍 [Trips] Tasks grouped by party:`, Array.from(grouped.entries()).map(([id, t]) => `party ${id}: ${t.length} tasks`).join(', '));

  const visitRequests: any[] = [];
  let sequence = 1;

  for (const point of routePoints) {
    const partyTasks = grouped.get(point.partyId);
    if (!partyTasks || partyTasks.length === 0) continue;

    const items: any[] = [];
    for (const task of partyTasks) {
      const leasingType = task.originalDetails?.leasingOrderDetails?.leasingOrderType;
      if (leasingType === "BOTH") {
        items.push({ referenceId: task.taskId, referenceType: task.taskType, deliveryType: "DELIVERY" });
        items.push({ referenceId: task.taskId, referenceType: task.taskType, deliveryType: "PICKUP" });
      } else if (leasingType === "PICKUP") {
        items.push({ referenceId: task.taskId, referenceType: task.taskType, deliveryType: "PICKUP" });
      } else {
        // Default to DELIVERY for DELIVERY type or unknown types
        items.push({ referenceId: task.taskId, referenceType: task.taskType, deliveryType: "DELIVERY" });
      }
    }

    visitRequests.push({
      partyId: point.partyId,
      partyType: point.partyType,
      sequence: sequence++,
      notes: "",
      items,
    });
  }

  return visitRequests;
}

// Set the custom fetch handler for trips
if (DOMAIN_CONFIGS.trips) {
  DOMAIN_CONFIGS.trips.customFetchHandler = fetchStepDataForTrips;
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
