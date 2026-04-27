/**
 * Completion Logic - Determines when a workflow should finish
 * 
 * This module encapsulates the complex decision tree for workflow completion,
 * making it testable and easier to reason about.
 */

export type CompletionDecision = 
  | { action: "kill_workflow"; reason: string }
  | { action: "keep_workflow"; reason: string }
  | { action: "advance"; reason: string };

/**
 * Decides whether to complete, continue, or advance a workflow based on current state.
 * 
 * @param isLastStep - Whether we're on the final step of the workflow
 * @param selectedWorkflow - The workflow name (e.g., "update_order", "create_order")
 * @param fieldsToUpdate - Array of specific fields being updated (for update workflows)
 * @param targetStep - The target step number for partial updates (optional)
 * @param currentStepNum - The current step number
 * @returns CompletionDecision indicating what action to take
 */
export function decideCompletion(
  isLastStep: boolean,
  selectedWorkflow: string,
  fieldsToUpdate: string[],
  targetStep: number | undefined,
  currentStepNum: number
): CompletionDecision {
  const isUpdate = selectedWorkflow.startsWith("update_");
  
  // Case 1: Not at last step and not at target step → advance
  if (!isLastStep && !(isUpdate && targetStep && currentStepNum >= targetStep)) {
    return { 
      action: "advance", 
      reason: "More steps remaining in workflow" 
    };
  }
  
  // Case 2: Update workflow with specific fields → close after target step
  if (isUpdate && fieldsToUpdate.length > 0 && targetStep && currentStepNum >= targetStep) {
    return { 
      action: "kill_workflow", 
      reason: "Update workflow completed specific field updates" 
    };
  }
  
  // Case 3: Natural last step → close workflow
  if (isLastStep) {
    return { 
      action: "kill_workflow", 
      reason: "Reached final step of workflow" 
    };
  }
  
  // Case 4: Update workflow at target step but no specific fields → keep workflow alive
  if (isUpdate && targetStep && currentStepNum >= targetStep) {
    return { 
      action: "keep_workflow", 
      reason: "Update workflow at target step but no specific fields to update" 
    };
  }
  
  // Default: advance to next step
  return { 
    action: "advance", 
    reason: "Default advancement" 
  };
}

/**
 * Determines if intent plan should be preserved for update workflows
 * that haven't reached their target step yet.
 */
export function shouldKeepIntentPlan(
  isUpdateWorkflow: boolean,
  targetStep: number | undefined,
  currentStepNum: number
): boolean {
  return isUpdateWorkflow && !!targetStep && currentStepNum < targetStep;
}
