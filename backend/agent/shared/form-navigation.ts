/**
 * Form Navigation Module
 * 
 * Unified navigation logic for workflow form steps.
 * Handles auto-skip, jump decisions, prerequisite checking, and step advancement.
 */

import { IntentState } from "../state";
import { isStepFilled, shouldSkipStep, validateFieldsInTargetStep } from "./form-utils";
import { getPrerequisiteCheckStartStep, getMinEntries, isFieldMatch } from "../../config/config-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface NavigationContext {
  selectedWorkflow: string;
  workflowType: 'create' | 'update' | 'delete' | 'unknown';
  isUpdateWorkflow: boolean;
  isCreateWorkflow: boolean;
  isNewWorkflowStart: boolean;
  currentStepNum: number;
  steps: any[];
}

export interface AutoSkipResult {
  finalStepNum: number;
  finalStepConfig: any;
  didAutoSkip: boolean;
}

export interface JumpDecision {
  shouldJump: boolean;
  targetStepNum: number | null;
  targetStepConfig: any | null;
  blockedByPrerequisite: boolean;
  redirectStepNum?: number;
}

// ============================================================================
// AUTO-SKIP LOGIC
// ============================================================================

/**
 * Perform auto-skip logic to advance through filled or skippable steps.
 * 
 * Features:
 * - Configurable via workflow formBehavior.autoSkipBehavior
 * - Never skips Step 1 when starting a new workflow
 * - Disabled for update workflows
 * - Disabled in correction mode
 * - Uses while-loop to skip multiple steps at once
 * 
 * @param currentStepNum - Current step number
 * @param currentStepConfig - Current step configuration
 * @param steps - Array of all workflow steps
 * @param accumulatedData - Current accumulated data
 * @param navContext - Navigation context
 * @param isCorrectionMode - Whether in correction mode
 * @param workflows - Workflow configurations
 * @returns AutoSkipResult with final step number and config
 */
export function performAutoSkip(
  currentStepNum: number,
  currentStepConfig: any,
  steps: any[],
  accumulatedData: any,
  navContext: NavigationContext,
  isCorrectionMode: boolean,
  workflows: any
): AutoSkipResult {
  const autoSkipWorkflowConfig = navContext.selectedWorkflow && 
    workflows[navContext.selectedWorkflow as keyof typeof workflows] as any;
  const autoSkipConfig = autoSkipWorkflowConfig?.formBehavior?.autoSkipBehavior || {
    enabled: true,
    skipIfAllOptional: true
  };
  
  // Check if current step is already filled (post-correction scenario)
  const isStepAlreadyFilled = isStepFilled(currentStepConfig, accumulatedData, getMinEntries);
  
  // Auto-skip if:
  // 1. Config enabled AND not in correction mode AND not update workflow, OR
  // 2. Step is already filled (allows skipping through filled steps after corrections)
  const shouldAutoSkip = (autoSkipConfig.enabled || isStepAlreadyFilled) && 
                         !isCorrectionMode && 
                         !navContext.isUpdateWorkflow &&
                         !(navContext.isNewWorkflowStart && currentStepNum === 1);
  
  let finalStepNum = currentStepNum;
  let finalStepConfig = currentStepConfig;
  let didAutoSkip = false;
  
  if (shouldAutoSkip) {
    // CRITICAL: Never auto-skip Step 1 when starting a new workflow
    // User should always see and confirm the first step
    const isStartingNewWorkflow = navContext.isNewWorkflowStart && currentStepNum === 1;
    
    if (!isStartingNewWorkflow) {
      while (finalStepNum < steps.length && finalStepConfig && 
             (isStepFilled(finalStepConfig, accumulatedData, getMinEntries) || shouldSkipStep(finalStepConfig, accumulatedData))) {
        didAutoSkip = true;
        finalStepNum++;
        const nextConfig = steps.find((s: any) => s.step === finalStepNum);
        if (!nextConfig) break;
        finalStepConfig = nextConfig;
      }
    }
  }
  
  return { finalStepNum, finalStepConfig, didAutoSkip };
}

// ============================================================================
// JUMP LOGIC
// ============================================================================

/**
 * Evaluate whether to jump to a different step based on user intent and workflow state.
 * 
 * Features:
 * - Supports forward and backward jumps
 * - Handles mid-workflow edits
 * - Validates fields exist in target step
 * - Checks prerequisites before jumping forward
 * - Skips prerequisite checks when jumping backward
 * 
 * @param state - Current intent state
 * @param navContext - Navigation context
 * @param fieldsToUpdate - Fields user wants to update
 * @param targetStepFromOrchestrator - Target step from orchestrator
 * @param isCorrectionMode - Whether in correction mode
 * @param accumulatedData - Current accumulated data
 * @param prerequisiteFieldName - Name of prerequisite field (e.g., 'customer_id', 'order_id')
 * @returns JumpDecision with target step and prerequisite status
 */
export function evaluateJumpDecision(
  state: IntentState,
  navContext: NavigationContext,
  fieldsToUpdate: string[],
  targetStepFromOrchestrator: number | null,
  isCorrectionMode: boolean,
  accumulatedData: any,
  prerequisiteFieldName: string = 'customer_id'
): JumpDecision {
  const { currentStepNum, steps } = navContext;
  
  // Get prerequisite field value (customer_id, order_id, route_id, etc.)
  const prerequisiteValue = accumulatedData[prerequisiteFieldName];
  
  console.log(`🔍 [evaluateJumpDecision] ${prerequisiteFieldName}: ${prerequisiteValue}`);
  
  // MID-WORKFLOW EDIT: If we're ALREADY in an update workflow (past Step 1) with prerequisite selected,
  // and the user wants to update specific fields, allow jumping between steps
  const hasMidWorkflowEdit = navContext.isUpdateWorkflow && 
    prerequisiteValue && 
    currentStepNum > 1 &&  // ★ Only if we're already past Step 1
    fieldsToUpdate.length > 0 &&
    targetStepFromOrchestrator && 
    targetStepFromOrchestrator > 1;
  
  // For update workflows starting at Step 1, if user specified particular fields,
  // jump directly to that step after prerequisite selection
  const isUpdateWorkflowWithSpecificTarget = navContext.isUpdateWorkflow &&
    currentStepNum === 1 &&
    prerequisiteValue &&
    fieldsToUpdate.length > 0 &&
    targetStepFromOrchestrator &&
    targetStepFromOrchestrator > 1;
  
  const isUpdateWorkflowWithTarget = navContext.isUpdateWorkflow && 
    targetStepFromOrchestrator && currentStepNum >= 2;
  
  // ★ If user is already past the target step, they've completed all prior steps.
  // Skip prerequisite checks entirely — applies to BOTH create and update workflows.
  const isJumpingBack = targetStepFromOrchestrator && currentStepNum > targetStepFromOrchestrator;
  
  const shouldJump = targetStepFromOrchestrator && (
    state.intent_plan?.status === "correction" || 
    (currentStepNum === 1 && !navContext.isUpdateWorkflow) ||  // ★ Only allow jump from Step 1 for non-update workflows
    isUpdateWorkflowWithTarget ||
    hasMidWorkflowEdit ||
    isUpdateWorkflowWithSpecificTarget
  );
  
  console.log(`\n🎯 JUMP DECISION (Mid-Workflow Check):`);
  console.log(`  - hasMidWorkflowEdit: ${hasMidWorkflowEdit}`);
  console.log(`  - isUpdateWorkflowWithSpecificTarget: ${isUpdateWorkflowWithSpecificTarget}`);
  console.log(`  - isJumpingBack: ${isJumpingBack}`);
  console.log(`  - ${prerequisiteFieldName} exists (resolved): ${!!prerequisiteValue}`);
  console.log(`  - fieldsToUpdate: ${fieldsToUpdate.join(', ')}`);
  console.log(`  - targetStep: ${targetStepFromOrchestrator}`);
  console.log(`  - currentStep: ${currentStepNum}`);
  console.log(`  - isUpdateWorkflow: ${navContext.isUpdateWorkflow}`);
  console.log(`  - shouldJump: ${shouldJump}\n`);
  
  if (!shouldJump || !targetStepFromOrchestrator) {
    return { shouldJump: false, targetStepNum: null, targetStepConfig: null, blockedByPrerequisite: false };
  }
  
  const targetStepNum = targetStepFromOrchestrator;
  const targetStepConfig = steps.find((s: any) => s.step === targetStepNum);
  
  if (!targetStepConfig) {
    return { shouldJump: false, targetStepNum: null, targetStepConfig: null, blockedByPrerequisite: false };
  }
  
  // Validate that requested fields exist in target step
  const redirectStepNum = validateFieldsInTargetStep(targetStepConfig, fieldsToUpdate, steps, isFieldMatch);
  if (redirectStepNum && redirectStepNum < targetStepNum) {
    return { shouldJump: true, targetStepNum, targetStepConfig, blockedByPrerequisite: false, redirectStepNum };
  }
  
  // ★ If jumping backward (user is past target step), skip ALL prerequisite checks.
  // The user has already completed those steps — they're just editing a previous field.
  if (isJumpingBack) {
    console.log(`✅ Jumping backward from Step ${currentStepNum} to Step ${targetStepNum} - skipping prerequisite checks (steps are already completed)`);
    return {
      shouldJump: true,
      targetStepNum,
      targetStepConfig,
      blockedByPrerequisite: false
    };
  }
  
  // For mid-workflow edits OR update workflows with specific targets, skip prerequisite checks
  if (hasMidWorkflowEdit || isUpdateWorkflowWithSpecificTarget) {
    console.log(`✅ ${isUpdateWorkflowWithSpecificTarget ? 'Update workflow with specific target' : 'Mid-workflow edit'} detected - skipping prerequisite checks`);
    return {
      shouldJump: true,
      targetStepNum,
      targetStepConfig,
      blockedByPrerequisite: false
    };
  }
  
  // Check prerequisites for forward jumps
  const prerequisiteCheck = checkPrerequisites(
    targetStepNum, 
    currentStepNum, 
    steps, 
    accumulatedData, 
    navContext, 
    isCorrectionMode,
    prerequisiteFieldName
  );
  
  return {
    shouldJump: true,
    targetStepNum,
    targetStepConfig,
    blockedByPrerequisite: prerequisiteCheck.blocked,
    redirectStepNum: prerequisiteCheck.redirectStepNum
  };
}

// ============================================================================
// PREREQUISITE CHECKING
// ============================================================================

/**
 * Check if prerequisites are met before jumping to a target step.
 * 
 * Features:
 * - Checks for prerequisite field (customer_id, order_id, etc.)
 * - Validates all steps between start and target are filled
 * - Configurable start step via getPrerequisiteCheckStartStep
 * - Skips checks for on-the-fly edits
 * 
 * @param targetStepNum - Target step number
 * @param currentStepNum - Current step number
 * @param steps - Array of all workflow steps
 * @param accumulatedData - Current accumulated data
 * @param navContext - Navigation context
 * @param isOnTheFlyEdit - Whether this is an on-the-fly edit
 * @param prerequisiteFieldName - Name of prerequisite field
 * @returns Object with blocked status and redirect step if blocked
 */
export function checkPrerequisites(
  targetStepNum: number,
  _currentStepNum: number,
  steps: any[],
  accumulatedData: any,
  navContext: NavigationContext,
  isOnTheFlyEdit: boolean,
  prerequisiteFieldName: string = 'customer_id'
): { blocked: boolean; redirectStepNum?: number } {
  const prerequisiteValue = accumulatedData[prerequisiteFieldName];
  
  if (!prerequisiteValue && targetStepNum > 1 && !isOnTheFlyEdit) {
    console.log(`🚫 [checkPrerequisites] Blocked: No ${prerequisiteFieldName} found`);
    return { blocked: true, redirectStepNum: 1 };
  }
  
  const startCheckFrom = getPrerequisiteCheckStartStep(
    navContext.selectedWorkflow, 
    navContext.workflowType
  );
  
  for (let i = startCheckFrom; i < targetStepNum; i++) {
    const stepConfig = steps.find((s: any) => s.step === i);
    if (stepConfig && !isStepFilled(stepConfig, accumulatedData, getMinEntries) && 
        !shouldSkipStep(stepConfig, accumulatedData)) {
      return { blocked: true, redirectStepNum: i };
    }
  }
  
  return { blocked: false };
}

export function determineEffectiveTargetStep(
  fieldsToUpdate: string[],
  steps: any[],
  targetStepFromOrchestrator: number | null,
  determineTargetStepFromFields?: (fields: string[], steps: any[]) => number | null
): number | null {
  if (targetStepFromOrchestrator) {
    return targetStepFromOrchestrator;
  }
  
  if (fieldsToUpdate.length > 0 && determineTargetStepFromFields) {
    return determineTargetStepFromFields(fieldsToUpdate, steps);
  }
  
  return null;
}

