import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(import.meta.dirname, '.env') })

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import {
  getHotelById, listHotels, searchHotels,
  getActiveAgreement, getAllActiveAgreements, getAllAgreements, getAgreementProducts,
  getInventoryPoolById, listInventoryPools,
  getReservationById, getReservationsByCustomer, listReservations,
  getOrderById, listOrders, searchOrders, getOrdersByCustomer,
  getIncompleteOrdersByCustomer, getPickupFulfillmentForOrder,
  getProductById, listProducts, searchProducts,
  listRoutes, getRouteById, listVendors, searchWashRequests
} from "./tools";
import { IntentState } from "./state";
import workflows from "./workflows/index";
import { buildSystemPrompt } from "../config/prompt-builder";
import { getMissingParams, getCollectionWidget, remapCollectedParams, TOOL_MAP } from "./tool-registry";
import { formatToolResult, formatHotelDetails } from "./widget-adapters";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0
});

const ALL_TOOLS = [
  getHotelById, listHotels, searchHotels,
  getActiveAgreement, getAllActiveAgreements, getAllAgreements, getAgreementProducts,
  getInventoryPoolById, listInventoryPools,
  getReservationById, getReservationsByCustomer, listReservations,
  getOrderById, listOrders, searchOrders, getOrdersByCustomer,
  getIncompleteOrdersByCustomer, getPickupFulfillmentForOrder,
  getProductById, listProducts, searchProducts,
  listRoutes, getRouteById, listVendors, searchWashRequests,
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFieldLabel(fieldName: string, workflowKey: string): string {
  const wfDef = (workflows as any)[workflowKey];
  if (wfDef) {
    for (const step of wfDef.steps ?? []) {
      const field = step.form?.fields?.find((f: any) => f.name === fieldName);
      if (field?.label) return field.label;
    }
  }
  return fieldName.replace(/_/g, " ");
}

function buildCompletionMessage(accData: Record<string, any>): string {
  const { completed_workflow_name, completed_workflow_key, completed_fields, completed_is_create } = accData;
  if (completed_is_create || !completed_fields?.length) {
    return `✅ ${completed_workflow_name || "Workflow"} completed successfully! Generating next steps...`;
  }
  const labels = (completed_fields as string[]).map(f => getFieldLabel(f, completed_workflow_key));
  return `✅ Updated ${labels.join(", ")} successfully. What would you like to do next?`;
}

function makeWorkflowResult(state: IntentState, formatted: Record<string, any>) {
  return {
    selected_workflow: state.workflow_result?.selected_workflow || null,
    currentstep: state.workflow_result?.currentstep || 0,
    message: formatted.message || "",
    ui_data: formatted.ui_widget ? formatted : null,
    widget_id: null,
    quick_actions: state.workflow_result?.quick_actions || null,
  };
}

function buildMessageHistory(state: IntentState): BaseMessage[] {
  const CONTEXT_WINDOW = 5;
  const history = state.messages || [];
  let start = Math.max(0, history.length - CONTEXT_WINDOW);
  while (start < history.length) {
    const m = history[start];
    if (m instanceof ToolMessage || (m instanceof AIMessage && (m.tool_calls?.length ?? 0) > 0)) {
      start++;
    } else break;
  }
  return history.slice(start) as BaseMessage[];
}

/** Execute a single tool call, handling special cases. Returns raw string result. */
async function executeToolCall(
  name: string,
  args: Record<string, any>
): Promise<{ raw: string; special?: Record<string, any> } | null> {
  const tool = TOOL_MAP[name];
  if (!tool) {
    console.log(`❌ Tool "${name}" not found in TOOL_MAP`);
    return null;
  }

  // Special case: get_hotel_by_id → parallel fetch hotel + agreement
  if (name === "get_hotel_by_id") {
    const customerId = args.id;
    const [hotelRaw, agreementRaw] = await Promise.all([
      TOOL_MAP["get_hotel_by_id"].invoke({ id: customerId }),
      TOOL_MAP["get_active_agreement"].invoke({ customerId }).catch(() => JSON.stringify({ error: "not found" })),
    ]);
    const formatted = formatHotelDetails(hotelRaw, agreementRaw);
    return { raw: hotelRaw, special: formatted };
  }

  const rawResult = await tool.invoke(args);
  return { raw: rawResult };
}

// ── Main node ─────────────────────────────────────────────────────────────────
const MAX_TOOL_ITERATIONS = 5;

export const chatnode = async (state: IntentState) => {
  // ── 1. Workflow completion message ────────────────────────────────────────
  if (state.accumulated_data?.just_completed === true) {
    return {
      workflow_result: {
        ...state.workflow_result,
        selected_workflow: null,
        currentstep: 0,
        message: buildCompletionMessage(state.accumulated_data),
        ui_data: null,
        widget_id: null,
      },
      accumulated_data: { ...state.accumulated_data, just_completed: false },
      intent_plan: {
        ...state.intent_plan,
        status: "pending",
        workflow: undefined,
        type: undefined,
        entity: undefined,
        fields_to_update: [],
        target_step: undefined
      },
      entity_context: { ...state.entity_context, active_workflow: null, current_step: 0 },
    };
  }

  // ── 2. Execute a pending tool call (params collected via widget) ──────────
  const pendingTool = state.accumulated_data?.pending_tool_call as
    { tool: string; collected_params: Record<string, any> } | undefined;
  const hasCollectedParams = state.user_data && Object.keys(state.user_data).length > 0;

  if (pendingTool?.tool && hasCollectedParams) {
    const remapped = remapCollectedParams(pendingTool.tool, state.user_data!);
    const mergedParams = { ...pendingTool.collected_params, ...remapped };
    const result = await executeToolCall(pendingTool.tool, mergedParams);
    if (result) {
      const formatted = result.special || formatToolResult(pendingTool.tool, result.raw);
      return {
        accumulated_data: { ...state.accumulated_data, pending_tool_call: undefined },
        user_data: {},
        workflow_result: makeWorkflowResult(state, formatted),
        session_context: state.session_context,
      };
    }
  }

  // ── 2b. Clear stale pending_tool_call when user sends new message ────────
  let cleanAccumulated = state.accumulated_data;
  if (pendingTool?.tool && !hasCollectedParams && state.intent_plan?.usermessage) {
    console.log(`🧹 Clearing stale pending_tool_call: ${pendingTool.tool}`);
    cleanAccumulated = { ...state.accumulated_data, pending_tool_call: undefined };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. REACT LOOP — LLM can chain multiple tool calls in one turn
  // ══════════════════════════════════════════════════════════════════════════
  const usermessage = state.intent_plan?.usermessage || "";
  const systemPrompt = buildSystemPrompt(state);
  const boundLlm = llm.bindTools(ALL_TOOLS);

  const hasActiveWorkflow = !!state.workflow_result?.selected_workflow;
  const history = hasActiveWorkflow ? buildMessageHistory(state) : [];

  // Build initial message list
  const messages: BaseMessage[] = [
    ...history,
    new HumanMessage(usermessage || "Hello"),
  ];

  let lastToolName = "";
  let lastToolResult = "";
  let lastSpecialFormatted: Record<string, any> | null = null;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    // ── Invoke LLM ─────────────────────────────────────────────────────
    const response = await boundLlm.invoke([
      new SystemMessage(systemPrompt),
      ...messages,
    ]);
    messages.push(response);

    // ── No tool call → LLM is done ────────────────────────────────────
    const toolCall = response.tool_calls?.[0];
    if (!toolCall) {
      const text = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
      console.log(`🤖 LLM returned text (iteration ${iteration}): "${text.substring(0, 150)}"`);
      break;
    }

    const { name, args, id: toolCallId } = toolCall;
    console.log(`🤖 LLM called tool: ${name}(${JSON.stringify(args)}) [iteration ${iteration}]`);

    // ── Check missing params → show collection widget, break loop ──────
    const missing = getMissingParams(name, args);
    if (missing.length > 0) {
      console.log(`⚠️ Tool ${name} missing params: ${missing.join(", ")}`);
      const widget = getCollectionWidget(name);
      const formatted = widget || {
        message: `To fetch this data I need: ${missing.join(", ")}. Please provide them.`,
      };
      return {
        accumulated_data: {
          ...cleanAccumulated,
          pending_tool_call: { tool: name, collected_params: args },
        },
        user_data: {},
        workflow_result: makeWorkflowResult(state, formatted),
        messages,
        session_context: state.session_context,
      };
    }

    // ── Execute tool ───────────────────────────────────────────────────
    const result = await executeToolCall(name, args);
    if (!result) break; // Tool not found

    console.log(`✅ Tool ${name} returned: ${result.raw.substring(0, 200)}`);

    // Track the latest tool for final formatting
    lastToolName = name;
    lastToolResult = result.raw;
    lastSpecialFormatted = result.special || null;

    // If special handler returned a formatted result (e.g. hotel_details),
    // it's terminal — return immediately
    if (result.special) {
      return {
        accumulated_data: { ...cleanAccumulated, pending_tool_call: undefined },
        user_data: {},
        workflow_result: makeWorkflowResult(state, result.special),
        messages,
        session_context: state.session_context,
      };
    }

    // Feed raw tool result back to LLM for potential chaining
    messages.push(
      new ToolMessage({
        content: result.raw,
        tool_call_id: toolCallId!,
        name,
      })
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. FORMAT FINAL RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if (lastToolName) {
    const formatted = lastSpecialFormatted || formatToolResult(lastToolName, lastToolResult);
    return {
      accumulated_data: { ...cleanAccumulated, pending_tool_call: undefined },
      user_data: {},
      workflow_result: makeWorkflowResult(state, formatted),
      messages,
      session_context: state.session_context,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PLAIN TEXT RESPONSE (no tool was called at all)
  // ══════════════════════════════════════════════════════════════════════════
  const lastMessage = messages[messages.length - 1];
  const messageText = lastMessage
    ? (typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content))
    : "Hello! How can I help you today?";

  return {
    accumulated_data: cleanAccumulated,
    workflow_result: makeWorkflowResult(state, { message: messageText }),
    messages,
    session_context: state.session_context,
  };
};
