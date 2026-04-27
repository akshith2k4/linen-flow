/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORCHESTRATOR: 4-LAYER THIN ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This orchestrator uses a 4-layer chain where each layer catches what the 
 * previous one missed. The LLM does semantic understanding, but deterministic
 * code enforces structural correctness.
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 1: PROMPT ENGINEERING                                             │
 * │ • Feeds the LLM field-to-step maps for UPDATE workflows                 │
 * │ • Includes current step context for active workflows                    │
 * │ • Provides classification instructions                                   │
 * │ Location: buildNoWorkflowPrompt(), buildActiveWorkflowPrompt()          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 2: LLM CLASSIFICATION                                             │
 * │ • LLM returns: workflow, target_step, fields_to_update                  │
 * │ • Accuracy: ~90% (probabilistic, makes mistakes)                        │
 * │ Location: llm.invoke() call                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 3: DETERMINISTIC VALIDATION (THIS FILE)                           │
 * │ • Corrects wrong step numbers using fieldToStepMap                      │
 * │ • Maps aliases to canonical field names                                 │
 * │ • Blocks accidental workflow switches (mid-creation guard)              │
 * │ • Field-based routing (billing_type → agreement, not hotel)             │
 * │ • View/action keyword guards                                            │
 * │ Location: After LLM call, before routing                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ LAYER 4: NAVIGATION ENGINE (form-navigation.ts)                         │
 * │ • Validates fields exist in target step                                 │
 * │ • Checks prerequisites (customer_id, order_id, etc.)                    │
 * │ • Auto-skip filled steps                                                │
 * │ • Auto-advance for update workflows                                     │
 * │ Location: form-navigation.ts                                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * The orchestrator is "thin" in code but "thick" in context. Intelligence 
 * comes from feeding the LLM the right prompt, then validating every decision
 * with deterministic code.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { IntentState } from "./state";
import { isMidCreationCorrection, buildFieldMappings, mapAliasesToCanonical } from "./brain-utils";
import { safeJsonParse } from "./safe-parse";
import { sanitizeSharedData } from "./shared/shared-data-utils";
import entities from "./entities.json";
import workflows from "./workflows/index";

dotenv.config({ path: resolve(import.meta.dirname, '.env') });

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface Classification {
  intent?: string;
  type: 'chat' | 'workflow' | 'correction' | 'new_workflow' | 'form_question' | 'form_data';
  entity?: string;
  workflow?: string;
  target_step?: number;
  fields_to_update?: string[];
  question_topic?: string;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derives entity domain from workflow name using entities.json */
function getEntityForWorkflow(workflowName: string): 'onboarding' | 'orders' | 'routes' | null {
  for (const [domain, config] of Object.entries(entities as any)) {
    if ((config as any).workflows?.includes(workflowName)) {
      return domain as 'onboarding' | 'orders' | 'routes';
    }
  }
  return null;
}

/** Builds clean workflow state — sanitizes shared_data, resets accumulated_data */
function buildWorkflowState(
  workflowName: string,
  state: IntentState,
  targetStep = 1,
  fieldsToUpdate: string[] = []
): Partial<IntentState> {
  const entity = getEntityForWorkflow(workflowName);
  if (!entity) {
    console.error(`❌ Unknown workflow: ${workflowName}`);
    return {};
  }

  const cleanSharedData = sanitizeSharedData(
    state.entity_context?.shared_data || {},
    entity
  );

  const isUpdate = fieldsToUpdate.length > 0 && targetStep > 1;

  return {
    intent_plan: {
      ...state.intent_plan,
      workflow: workflowName,
      target_step: targetStep,
      fields_to_update: fieldsToUpdate,
      has_mid_workflow_edit: isUpdate,
      is_update_workflow_with_specific_target: isUpdate,
      status: "classified",
    },
    entity_context: {
      ...state.entity_context,
      entity_type: entity,
      entity_name: (entities as any)[entity].name,
      active_workflow: workflowName,
      current_step: 1,
      shared_data: cleanSharedData,
    } as any,
    accumulated_data: { _reset: true },
    workflow_result: {
      selected_workflow: workflowName,
      currentstep: 1,
      message: "",
      ui_data: null,
      widget_id: null,
      quick_actions: null,
    } as any,
    user_data: {},
  };
}

// ── Prompts ───────────────────────────────────────────────────────────────────

/**
 * LAYER 1: PROMPT ENGINEERING
 * 
 * Builds a rich prompt with field-to-step maps to help the LLM make accurate decisions.
 * This is where the real intelligence lives — not in the LLM, but in what we feed it.
 */
function buildNoWorkflowPrompt(usermessage: string): string {
  // Build workflow list with field-to-step maps for UPDATE workflows
  const workflowLines: string[] = [];
  
  for (const [domain, config] of Object.entries(entities as any)) {
    for (const workflowName of (config as any).workflows) {
      const workflowDef = workflows[workflowName as keyof typeof workflows];
      
      if (!workflowDef) continue;
      
      // Check if this is an update workflow (has steps with field_names)
      const isUpdateWorkflow = 'steps' in workflowDef && 
        workflowDef.steps.some((s: any) => s.field_names && s.field_names.length > 0);
      
      if (isUpdateWorkflow && 'steps' in workflowDef) {
        // For UPDATE workflows: include field-to-step map
        const fieldSummary = workflowDef.steps
          .map((s: any) => `Step ${s.step}: ${s.field_names?.join(', ') || ''}`)
          .filter((line: string) => !line.endsWith(': '))
          .join(' | ');
        
        workflowLines.push(`  - ${workflowName} (${domain}): Update workflow\n    Fields → ${fieldSummary}`);
      } else {
        // For CREATE workflows: just the description
        workflowLines.push(`  - ${workflowName} (${domain}): Create workflow`);
      }
    }
  }
  
  const workflowList = workflowLines.join('\n');

  return `You are an intent classifier for a hotel management system.

AVAILABLE WORKFLOWS:
${workflowList}

RULES:
- Classify as "workflow" when user wants to CREATE, UPDATE, EDIT, MODIFY, GENERATE, ONBOARD, or ASSIGN something.
- Classify as "chat" when user wants to VIEW, SHOW, LIST, FIND, SEARCH, CHECK, or ASK a question.
- For UPDATE workflows: 
  * Use the "Fields →" map above to find which step contains the field
  * Return CANONICAL field names (from the map) in fields_to_update
  * Set target_step to the step number where the field lives
- Route by FIELD not noun: "update billing type of hotel" → update_agreement (billing_type is an agreement field).

OUTPUT: raw JSON only, no markdown.

For workflow:
{"type":"workflow","entity":"<domain>","workflow":"<name>","target_step":<n>,"fields_to_update":[],"status":"classified"}

For chat:
{"type":"chat","status":"classified"}

Message: "${usermessage}"`;
}

function buildActiveWorkflowPrompt(state: IntentState, usermessage: string): string {
  const activeWorkflow = state.entity_context?.active_workflow!;
  const currentStep = state.entity_context?.current_step || 1;

  // Get workflow definition
  const wf = workflows[activeWorkflow as keyof typeof workflows];
  
  let stepInfo = "";
  let stepMap = "";
  
  if (wf && 'steps' in wf) {
    // Current step fields
    const step = (wf.steps as any[]).find((s: any) => s.step === currentStep);
    if (step) {
      const fields = step.form?.fields?.map((f: any) => f.label || f.name).join(", ") || "";
      stepInfo = `\nCurrent step ${currentStep}: ${step.title} — Fields: ${fields}`;
    }
    
    // Full step map for corrections/navigation
    const stepLines = (wf.steps as any[])
      .map((s: any) => {
        const fieldNames = s.field_names?.join(', ') || '';
        return fieldNames ? `  Step ${s.step} "${s.title}": ${fieldNames}` : '';
      })
      .filter(Boolean);
    
    if (stepLines.length > 0) {
      stepMap = `\n\nAll steps (for corrections/navigation):\n${stepLines.join('\n')}`;
    }
  }

  return `You are an intent classifier for an active workflow.

Active workflow: ${activeWorkflow}${stepInfo}${stepMap}

TYPES:
- "form_question": user asks about a field (what is?, explain?)
- "correction": user wants to change a field in this workflow (use the step map above to find target_step)
- "new_workflow": user wants to start a completely different workflow
- "chat": general conversation

For corrections: Return CANONICAL field names (from the step map) in fields_to_update.

OUTPUT: raw JSON only.
{"type":"form_question|correction|new_workflow|chat","workflow":"${activeWorkflow}","target_step":<n>,"fields_to_update":[],"question_topic":"","status":"classified"}

Message: "${usermessage}"`;
}

// ── Main node ─────────────────────────────────────────────────────────────────
export const orchestratornode = async (state: IntentState) => {
  // ── 1. Form submission bypass (no LLM) ───────────────────────────────────
  if (state.user_data && Object.keys(state.user_data).length > 0) {
    return {
      intent_plan: { ...state.intent_plan, intent: "form_submission", type: "workflow", status: "form_submitted" },
      session_context: state.session_context,
    };
  }

  // ── 2. No message (resume flow) ──────────────────────────────────────────
  if (!state.intent_plan?.usermessage) return {};

  const usermessage = state.intent_plan.usermessage;
  const activeWorkflow = state.entity_context?.active_workflow;
  const justCompleted = state.accumulated_data?.just_completed === true;
  const currentMessage = new HumanMessage(usermessage);

  // ── 3. Build prompt based on whether a workflow is active ────────────────
  const systemPrompt = (!activeWorkflow || justCompleted)
    ? buildNoWorkflowPrompt(usermessage)
    : buildActiveWorkflowPrompt(state, usermessage);

  // ── 4. LLM call ──────────────────────────────────────────────────────────
  const response = await llm.invoke([new SystemMessage(systemPrompt), currentMessage]);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const match = content.match(/{[\s\S]*}/);
  if (!match) {
    return { intent_plan: { ...state.intent_plan, type: "chat", status: "classified" }, messages: [currentMessage] };
  }

  const classification: Classification | null = safeJsonParse(match[0], 'orchestrator');
  if (!classification) {
    return { intent_plan: { ...state.intent_plan, type: "chat", status: "classified" }, messages: [currentMessage] };
  }

  console.log("🧠 Classification:", JSON.stringify(classification));

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 3: DETERMINISTIC VALIDATION
  // ══════════════════════════════════════════════════════════════════════════
  // The LLM is probabilistic and makes mistakes. This layer corrects them.
  
  // ── Correction 1: Step Number Validation ─────────────────────────────────
  // If the LLM picked the wrong step for a field, correct it using fieldToStepMap
  if ((classification.type === 'workflow' || classification.type === 'correction') && 
      classification.fields_to_update?.length && 
      classification.target_step) {
    
    const targetWorkflow = classification.workflow || activeWorkflow;
    
    if (targetWorkflow) {
      const { fieldToStepMap, aliasToCanonical } = buildFieldMappings(targetWorkflow);
      
      // Map aliases to canonical field names
      const originalFields = [...classification.fields_to_update];
      classification.fields_to_update = mapAliasesToCanonical(
        classification.fields_to_update, 
        aliasToCanonical
      );
      
      if (JSON.stringify(originalFields) !== JSON.stringify(classification.fields_to_update)) {
        console.log(`🔄 [Layer 3] Mapped aliases: ${originalFields.join(', ')} → ${classification.fields_to_update.join(', ')}`);
      }
      
      // Validate step number against first field
      const firstField = classification.fields_to_update[0]?.toLowerCase();
      if (firstField) {
        const correctStep = fieldToStepMap[firstField];
        
        if (correctStep && correctStep !== classification.target_step) {
          console.log(`🔧 [Layer 3] Step correction: LLM said ${classification.target_step}, correct is ${correctStep} for field "${firstField}"`);
          classification.target_step = correctStep;
        }
      }
    }
  }

  // ── Correction 2: View/Read Intent Guard ─────────────────────────────────
  // ── Correction 2: View/Read Intent Guard ─────────────────────────────────
  // View/read intent should never trigger a workflow
  const viewKeywords = /\b(know|show|view|list|display|find|search|check|get|fetch|details|history|status|what\s+are|which|how\s+many)\b/i;
  const actionKeywords = /\b(create|start|new|generate|onboard|place|update|edit|change|modify|fix|correct|delete|remove|assign)\b/i;
  if (classification.type === 'workflow' && viewKeywords.test(usermessage) && !actionKeywords.test(usermessage)) {
    console.log(`🔧 [Layer 3] View keyword detected - forcing type to 'chat'`);
    classification.type = 'chat';
  }

  // ── Correction 3: Field-Based Workflow Routing (Noun Trap Guard) ─────────
  // ── Correction 3: Field-Based Workflow Routing (Noun Trap Guard) ─────────
  // Route by field, not by noun (e.g., "billing type" → agreement, not hotel)
  if (classification.workflow) {
    const agreementFields = /\b(billing\s*type|billing\s*cycle|credit\s*days|deposit|occupancy|total\s*rooms|linen|service\s*frequency|products|prices|agreement\s*type|start\s*date|end\s*date)\b/i;
    const hotelFields = /\b(gstin|pan|contact\s*person|phone|email|customer\s*type|status|address)\b/i;
    
    if (classification.workflow === "update_hotel" && agreementFields.test(usermessage)) {
      console.log(`🔧 [Layer 3] Field-based routing: update_hotel → update_agreement (agreement field detected)`);
      classification.workflow = "update_agreement";
    } else if (classification.workflow === "update_agreement" && hotelFields.test(usermessage)) {
      console.log(`🔧 [Layer 3] Field-based routing: update_agreement → update_hotel (hotel field detected)`);
      classification.workflow = "update_hotel";
    }
  }

  // ── Correction 4: Mid-Creation Guard ─────────────────────────────────────
  // ── Correction 4: Mid-Creation Guard ─────────────────────────────────────
  // Keep active workflow unless user explicitly creates something new
  const isExplicitCreate = /\b(create|generate|new|start)\s+(agreement|hotel|onboard|order|route)/i.test(usermessage);
  if (isMidCreationCorrection(usermessage, activeWorkflow) && 
      classification.workflow !== activeWorkflow && 
      !isExplicitCreate) {
    console.log(`🔧 [Layer 3] Mid-creation guard: forcing workflow back to ${activeWorkflow}`);
    classification.workflow = activeWorkflow ?? undefined;
    classification.type = "correction";
    classification.status = "correction";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // END LAYER 3
  // ══════════════════════════════════════════════════════════════════════════

  // ── 6. Route to handler ──────────────────────────────────────────────────
  switch (classification.type) {
    case 'form_question':
      return {
        intent_plan: { ...state.intent_plan, status: "form_question", question_about: classification.question_topic },
        messages: [currentMessage],
        session_context: state.session_context,
      };

    case 'correction': {
      return {
        intent_plan: {
          ...state.intent_plan,
          workflow: activeWorkflow ?? classification.workflow,
          target_step: classification.target_step,
          fields_to_update: classification.fields_to_update || [],
          status: "correction",
        },
        messages: [currentMessage],
        session_context: state.session_context,
      };
    }

    case 'new_workflow':
    case 'workflow': {
      const workflowName = classification.workflow;
      if (!workflowName) {
        return { intent_plan: { ...state.intent_plan, type: "chat", status: "classified" }, messages: [currentMessage] };
      }
      const newState = buildWorkflowState(
        workflowName,
        state,
        classification.target_step || 1,
        classification.fields_to_update || []
      );
      return { ...newState, messages: [currentMessage], session_context: state.session_context };
    }

    case 'chat':
    default:
      return {
        intent_plan: { ...state.intent_plan, intent: classification.intent || "general_chat", type: "chat", status: "classified" },
        messages: [currentMessage],
        session_context: state.session_context,
      };
  }
};