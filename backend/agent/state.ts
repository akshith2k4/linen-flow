import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export interface Intent {
  intent: string;
  usermessage: string;
  type?: string;              // ★ FIX: Allow undefined
  workflow?: string;          // ★ FIX: Allow undefined
  entity?: string;            
  fields_to_update?: string[];
  target_step?: number;
  original_correction_text?: string;
  status: string;
  clarification_question?: string;
  question_about?: string;   // ← NEW: for entity_question type
  has_mid_workflow_edit?: boolean;  // ← NEW: for update workflows with specific target
  is_update_workflow_with_specific_target?: boolean;  // ← NEW: for form jump logic
}

export interface WorkflowStep {
  step: number;
  title?: string;
  description?: string;
  form?: { fields: any[] };
  api?: { endpoint: string; method: string };
  fetch_current_data?: { endpoint: string; method?: string; store_as?: string; headers?: Record<string, string> };
}

export interface WorkflowResult {
  selected_workflow: string | null;
  workflow_name?: string;
  steps?: WorkflowStep[];
  currentstep: number;
  message: string;
  quick_actions?: Array<{
    label: string;
    action: string;
  }>;
}

export interface FormSchema {
  form: {
    title?: string;
    description?: string;
    fields: any[];
    submit?: { label: string };
    multiple?: boolean;
    list_key?: string;
    min_entries?: number;
    add_label?: string;
    current_step?: number;
    total_steps?: number;
    type?: string;
    layout?: any;
  };
  accumulated_data?: Record<string, any>;
}

export const MessagesState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => {
      const merged = [...curr, ...update];
      // Keep only the last 50 messages to prevent RAM exhaustion in MemorySaver
      return merged.length > 50 ? merged.slice(-50) : merged;
    },
    default: () => []
  }),

  intent_plan: Annotation<Intent>(),
  
  workflow_result: Annotation<WorkflowResult | null>({
    reducer: (curr, update) => {
        if (update === null || update?.selected_workflow === null) return update;
        if (!curr) return update;
        return { ...curr, ...update };
    }, 
    default: () => null
  }),
  
  form_schema: Annotation<FormSchema | null>({
    reducer: (curr, update) => update, 
    default: () => null
  }),
  
  user_data: Annotation<Record<string, any>>({
    reducer: (curr, update) => update, 
    default: () => ({})
  }),

  accumulated_data: Annotation<Record<string, any>>({
    reducer: (curr, update) => {
      if (update && update._reset === true) {
        console.log(`🔄 ACCUMULATED_DATA RESET TRIGGERED`);
        console.log(`   Before reset - keys:`, Object.keys(curr));
        console.log(`   Reset data - keys:`, Object.keys(update));
        // Return the reset data WITHOUT the _reset flag
        // This ensures downstream nodes get clean data
        const { _reset, ...cleanData } = update;
        console.log(`   After reset - keys:`, Object.keys(cleanData));
        return cleanData;
      }
      return { ...curr, ...update };
    }, 
    default: () => ({})
  }),

  // ═══════════════════════════════════════════════════════════════
  // NEW: Entity context — add this AFTER accumulated_data
  // ═══════════════════════════════════════════════════════════════
  entity_context: Annotation<{
    entity_type: 'onboarding' | 'orders' | 'routes' | null;
    entity_name: string;
    active_workflow: string | null;
    current_step: number;
    message: string;
    shared_data: Record<string, any>;
  }>({
    reducer: (curr, update) => {
      if (!update) return curr;
      // Handle explicit reset
      if ((update as any)._reset) {
        const reset = { ...update };
        delete (reset as any)._reset;
        return Object.assign({
          entity_type: null as any,
          entity_name: '',
          active_workflow: null,
          current_step: 0,
          message: '',
          shared_data: {}
        }, reset);
      }
      return { ...curr, ...update };
    },
    default: () => ({
      entity_type: null,
      entity_name: '',
      active_workflow: null,
      current_step: 0,
      message: '',
      shared_data: {}
    })
  }),

  session_context: Annotation<{
    last_created_hotel?: { id: string; name: string; created_at: number };
    created_hotels?: Array<{ id: string; name: string; created_at: number }>;
    interacted_hotels?: Array<{ id: string; name: string; interaction_type: 'created' | 'updated' | 'viewed'; created_at: number }>;
    last_created_agreement?: { id: string; customerId: string; created_at: number };
    created_agreements?: Array<{ id: string; customerId: string; created_at: number }>;
    last_created_pool?: { id: string; name: string; created_at: number };
    last_search?: {
      type: 'hotels' | 'pools' | 'reservations' | 'orders';
      params: Record<string, any>;
      current_page: number;
      page_size: number;
      total_count: number;
      timestamp: number;
      widget_id: string; // Unique ID to track which widget to update
    };
  }>({
    reducer: (curr, update) => ({ ...curr, ...update }),
    default: () => ({})
  })
});

export type IntentState = typeof MessagesState.State;