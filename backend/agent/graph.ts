import { END, START, StateGraph, MemorySaver } from "@langchain/langgraph";
import { MessagesState, IntentState } from "./state";
import { orchestratornode } from "./orchestrator";
import { chatnode } from "./chat";
import { unifiedFormNode } from "./shared/unified-form-node";
import { unifiedApiNode } from "./workflow-handlers/unified-api-node";

// ============================================================================
// SIMPLIFIED ROUTING (No Brain Layer, No Entity Router)
// ============================================================================

const routeAfterOrchestrator = (state: IntentState) => {
  console.log("\n🔀 ROUTING AFTER ORCHESTRATOR:");
  
  if (!state.intent_plan?.type) {
    console.log("   → Routing to: chatnode (No intent type)");
    return "chatnode";
  }

  // Form submission: route to unified API node
  if (state.intent_plan.status === "form_submitted") {
    if (state.entity_context?.active_workflow) {
      console.log("   → Routing to: unified_api (Form Submission)");
      return "unified_api";
    }
    console.log("   → Routing to: chatnode (Form submitted but no active workflow)");
    return "chatnode";
  }

  // Form question: route to unified form for clarification
  if (state.intent_plan.status === "form_question") {
    console.log("   → Routing to: unified_form (Form Question)");
    return "unified_form";
  }

  // Chat / question passthrough
  if (state.intent_plan.type === "chat") {
    console.log("   → Routing to: chatnode");
    return "chatnode";
  }

  // Workflow request (new workflow, correction, form_data) → unified form
  if (state.intent_plan.type === "workflow" || 
      state.intent_plan.type === "correction" || 
      state.intent_plan.type === "new_workflow" ||
      state.intent_plan.type === "form_data") {
    console.log(`   → Routing to: unified_form (${state.intent_plan.type})`);
    return "unified_form";
  }

  // Default fallback
  console.log("   → Routing to: chatnode (Default fallback)");
  return "chatnode";
};

const routeAfterUnifiedApi = (state: IntentState) => {
  console.log("\n🔀 ROUTING AFTER UNIFIED API:");
  console.log("   active_workflow:", state.entity_context?.active_workflow);
  console.log("   current_step:", state.entity_context?.current_step);
  console.log("   entity_type:", state.entity_context?.entity_type);

  // Workflow was killed (completed or smart-exit)
  if (!state.entity_context?.active_workflow) {
    if (state.accumulated_data?.just_completed) {
      console.log("   → Routing to: chatnode (workflow just completed)");
      return "chatnode";
    }
    console.log("   → Routing to: END (workflow closed)");
    return END;
  }

  // More steps remaining → loop back to unified form
  console.log(`   → Routing to: unified_form (Step ${state.entity_context.current_step})`);
  return "unified_form";
};

const routeAfterChatnode = (state: IntentState) => {
  console.log("\n🔀 ROUTING AFTER CHATNODE:");

  // If entity workflow is active, route to unified form
  if (state.entity_context?.active_workflow) {
    console.log("   → Routing to: unified_form (Active workflow)");
    return "unified_form";
  }
  
  console.log("   → Routing to: END");
  return END;
};

// ============================================================================
// GRAPH CONSTRUCTION (Simplified - No Brain Layer)
// ============================================================================

const builder = new StateGraph(MessagesState)
  // ── Core nodes ──────────────────────────────────────────────────
  .addNode("orchestrator", orchestratornode)
  .addNode("chatnode", chatnode)
  .addNode("unified_form", (state: IntentState) => unifiedFormNode(state, 0))
  .addNode("unified_api", unifiedApiNode)

  // ── Edges ───────────────────────────────────────────────────────
  .addEdge(START, "orchestrator")

  // Orchestrator → unified_form / unified_api / chatnode
  .addConditionalEdges("orchestrator", routeAfterOrchestrator, {
    "chatnode": "chatnode",
    "unified_form": "unified_form",
    "unified_api": "unified_api"
  })

  // Unified form → unified API
  .addEdge("unified_form", "unified_api")

  // Unified API → loop back to unified form / chatnode / END
  .addConditionalEdges("unified_api", routeAfterUnifiedApi, {
    "unified_form": "unified_form",
    "chatnode": "chatnode",
    [END]: END
  })

  // Chatnode → unified form / END
  .addConditionalEdges("chatnode", routeAfterChatnode, {
    "unified_form": "unified_form",
    [END]: END
  });


const checkpointer = new MemorySaver();

// Interrupt before unified API node for user confirmation
export const graph = builder.compile({
  checkpointer,
  interruptBefore: ["unified_api"] 
});