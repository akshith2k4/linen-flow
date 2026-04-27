import workflows from "./workflows/index";
import workflowMetadata from "../config/workflow-metadata.json";
import { WorkflowType, getWorkflowType as getWorkflowTypeFromConfig } from "../config/workflow-types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FieldToStepMap {
  [fieldName: string]: number;
}

export interface AliasToCanonicalMap {
  [alias: string]: string;
}

export type { WorkflowType };

// ============================================================================
// WORKFLOW TYPE DETECTION
// ============================================================================

/**
 * Determines the workflow type from centralized configuration
 * Uses the single source of truth from workflow-types.ts
 */
export function getWorkflowType(workflowKey: string): WorkflowType {
  return getWorkflowTypeFromConfig(workflowKey);
}

// ============================================================================
// FIELD MAPPING UTILITIES
// ============================================================================

/**
 * Builds field-to-step and alias-to-canonical mappings from workflow definition
 */
export function buildFieldMappings(workflowKey: string): {
  fieldToStepMap: FieldToStepMap;
  aliasToCanonical: AliasToCanonicalMap;
  stepContext: string;
} {
  const workflowDef = workflows[workflowKey as keyof typeof workflows];
  const fieldToStepMap: FieldToStepMap = {};
  const aliasToCanonical: AliasToCanonicalMap = {};

  if (!workflowDef || !('steps' in workflowDef) || !workflowDef.steps) {
    return { fieldToStepMap, aliasToCanonical, stepContext: '' };
  }

  const stepContextLines: string[] = [];
  // stepNum → canonicalField → Set of aliases
  const fieldGroups: Record<number, Record<string, Set<string>>> = {};

  for (const step of workflowDef.steps) {
    const stepAny = step as any;
    const stepNum: number = stepAny.step;
    const fieldNames: string[] = stepAny.field_names || [];

    stepContextLines.push(`Step ${stepNum}: ${stepAny.title} (Fields: ${fieldNames.join(", ")})`);

    if (!fieldGroups[stepNum]) fieldGroups[stepNum] = {};
    const stepGroup = fieldGroups[stepNum]!;

    // Register canonical field names
    for (const fieldName of fieldNames) {
      fieldToStepMap[fieldName.toLowerCase()] = stepNum;
      if (fieldName.includes('.')) {
        const parent = fieldName.split('.')[0];
        if (parent) fieldToStepMap[parent.toLowerCase()] = stepNum;
      }
      if (!stepGroup[fieldName]) {
        stepGroup[fieldName] = new Set();
      }
    }

    // Register aliases and group them under their canonical
    for (const [alias, canonical] of Object.entries(stepAny.field_aliases || {})) {
      const aliasLower = alias.toLowerCase();
      const canonStr = canonical as string;
      aliasToCanonical[aliasLower] = canonStr;
      fieldToStepMap[aliasLower] = stepNum;

      if (!stepGroup[canonStr]) {
        stepGroup[canonStr] = new Set();
      }
      stepGroup[canonStr].add(aliasLower);
    }
  }

  // ⚡ COMPRESSED LOOKUP TABLE: one line per canonical field instead of one line per alias
  const lookupLines: string[] = [];
  for (const [stepStr, fields] of Object.entries(fieldGroups)) {
    for (const [canon, aliasSet] of Object.entries(fields)) {
      const aliases = Array.from(aliasSet);
      lookupLines.push(
        aliases.length > 0
          ? `Step ${stepStr}: ${canon} (aliases: ${aliases.join(', ')})`
          : `Step ${stepStr}: ${canon}`
      );
    }
  }

  const stepContext = `[FIELD-TO-STEP MAP for ${workflowKey}]
${stepContextLines.join("\n")}

[LOOKUP TABLE]
${lookupLines.join("\n")}

CRITICAL: Return CANONICAL field names (not aliases) in fields_to_update.
1. Find the user's field keyword in the LOOKUP TABLE above (check aliases too)
2. Use that row's Step number as target_step
3. If multiple fields map to different steps, choose the LOWEST step number`;

  console.log(`🎯 Built field-to-step map with ${Object.keys(fieldToStepMap).length} entries (${lookupLines.length} lookup rows) for workflow: ${workflowKey}`);

  return { fieldToStepMap, aliasToCanonical, stepContext };
}

/**
 * Maps alias field names to their canonical equivalents
 */
export function mapAliasesToCanonical(
  fields: string[],
  aliasToCanonical: AliasToCanonicalMap
): string[] {
  return fields.map(field => {
    const fieldLower = field.toLowerCase();
    const canonical = aliasToCanonical[fieldLower];
    
    if (canonical) {
      console.log(`🔄 Mapping alias "${field}" → canonical "${canonical}"`);
      return canonical;
    }
    
    return field;
  });
}

// ============================================================================
// MID-CREATION DETECTION
// ============================================================================

/**
 * Detects if the user is making a mid-creation correction
 * Uses centralized workflow type configuration
 */
export function isMidCreationCorrection(
  userMsg: string,
  activeWorkflow: string | null | undefined
): boolean {
  if (!activeWorkflow) return false;
  
  // Use centralized workflow type detection
  const workflowType = getWorkflowType(activeWorkflow);
  if (workflowType !== 'create') return false;
  
  const updateKeywords = ["update", "edit", "change", "modify", "fix", "wrong"];
  const msgLower = userMsg.toLowerCase();
  
  return updateKeywords.some(kw => msgLower.includes(kw));
}
