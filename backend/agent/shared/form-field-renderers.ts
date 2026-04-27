/**
 * Form Field Renderers Module
 * 
 * Unified field resolution logic for all form nodes.
 * Handles field type-specific rendering, data source resolution,
 * default value extraction, and special field behaviors.
 */

import { resolveFieldDataSource } from "./data-source-resolver";
import { safeDateFieldValue, getNestedValue } from "./form-utils";

// ============================================================================
// TYPES
// ============================================================================

interface FieldRenderContext {
  workflowType: 'create' | 'update' | 'delete' | 'unknown';
  selectedWorkflow: string;
  isUpdateWorkflow: boolean;
  isCreateWorkflow: boolean;
  sessionOptions?: {
    hotels?: any[];
    orders?: any[];
    routes?: any[];
  };
  currentEntityData?: any;
}

// ============================================================================
// FIELD TYPE HANDLERS
// ============================================================================

/**
 * Handle text/number/textarea/checkbox fields - simple default value extraction
 */
function handleSimpleField(field: any, accumulatedData: any): any {
  let defaultValue = accumulatedData[field.name];
  
  // Handle dot-notation field names (e.g., "billingAddress.addressLine1")
  if (defaultValue === undefined && field.name.includes('.')) {
    defaultValue = getNestedValue(accumulatedData, field.name);
    if (defaultValue !== undefined) {
      console.log(`📍 Dot-notation field "${field.name}" resolved to: ${JSON.stringify(defaultValue).substring(0, 100)}`);
    }
  }
  
  return {
    ...field,
    type: field.type || "text",
    label: field.label || field.name,
    required: field.required ?? true,
    defaultValue
  };
}

/**
 * Handle date and datetime-local fields with normalization
 */
function handleDateField(field: any, accumulatedData: any): any {
  let defaultValue = accumulatedData[field.name];
  
  // Handle dot-notation
  if (defaultValue === undefined && field.name.includes('.')) {
    defaultValue = getNestedValue(accumulatedData, field.name);
  }
  
  // Normalize ISO date strings to YYYY-MM-DD or YYYY-MM-DDTHH:mm
  if ((field.type === 'date' || field.type === 'datetime-local') && defaultValue) {
    const normalised = safeDateFieldValue(defaultValue, field.type as 'date' | 'datetime-local');
    if (normalised !== undefined) {
      console.log(`📅 Date field "${field.name}" converted to: ${normalised}`);
      defaultValue = normalised;
    } else if (defaultValue) {
      console.warn(`📅 Date field "${field.name}" has invalid value "${defaultValue}", clearing`);
      defaultValue = undefined;
    }
  }
  
  return {
    ...field,
    type: field.type,
    label: field.label || field.name,
    required: field.required ?? true,
    defaultValue
  };
}

/**
 * Handle dropdown fields with options_source
 */
function handleDropdownField(field: any, accumulatedData: any): any {
  let defaultValue = accumulatedData[field.name];
  
  // Handle dot-notation
  if (defaultValue === undefined && field.name.includes('.')) {
    defaultValue = getNestedValue(accumulatedData, field.name);
  }
  
  if (field.options_source) {
    // Try both direct source and *_options suffix
    const optionsKey = `${field.options_source}_options`;
    const sourceData = accumulatedData[optionsKey] || accumulatedData[field.options_source];
    
    if (Array.isArray(sourceData) && sourceData.length > 0) {
      const options = sourceData.map((item: any) => {
        // Handle both pre-formatted options and raw data
        if (item.value !== undefined && item.label !== undefined) {
          return item;
        }
        return {
          label: item[field.label_key || "name"],
          value: String(item[field.value_key || "id"]),
          ...item
        };
      });
      
      return {
        ...field,
        options,
        type: "dropdown",
        label: field.label || field.name,
        required: field.required ?? true,
        defaultValue
      };
    }
    
    // Fallback for missing or empty options
    return {
      ...field,
      options: [],
      type: "dropdown",
      label: field.label || field.name,
      required: field.required ?? true,
      defaultValue: undefined,
      placeholder: `Select ${field.label || field.name}...`
    };
  }
  
  // Dropdown without options_source - return as-is
  return {
    ...field,
    type: "dropdown",
    label: field.label || field.name,
    required: field.required ?? true,
    defaultValue
  };
}

/**
 * Handle lookup fields with api_source
 */
function handleLookupField(field: any, accumulatedData: any): any {
  let defaultValue = accumulatedData[field.name];
  
  // Handle dot-notation
  if (defaultValue === undefined && field.name.includes('.')) {
    defaultValue = getNestedValue(accumulatedData, field.name);
  }
  
  return {
    ...field,
    type: "lookup",
    label: field.label || field.name,
    required: field.required ?? true,
    defaultValue,
    search_config: {
      endpoint: field.api_source,
      value_key: field.value_key || "id",
      label_key: field.label_key || "name",
      search_param: field.search_param || "name"
    },
    api_source: field.api_source,
    value_key: field.value_key || "id",
    label_key: field.label_key || "name",
    placeholder: field.placeholder || `Search ${field.label || field.name}...`,
    search_on_frontend: field.search_on_frontend ?? true
  };
}

/**
 * Handle customer_id/customerId lookup field with session options
 * This is the most complex field type with workflow-specific behavior
 */
function handleCustomerIdField(
  field: any, 
  accumulatedData: any, 
  context: FieldRenderContext
): any {
  console.log(`🔍 DEBUG handleCustomerIdField: Processing customer field "${field.name}"`);
  console.log(`  - context.sessionOptions?.hotels:`, context.sessionOptions?.hotels?.length || 0);
  console.log(`  - accumulatedData._session_hotel_options:`, accumulatedData._session_hotel_options?.length || 0);
  
  const sessionHotelOptions = context.sessionOptions?.hotels || accumulatedData._session_hotel_options;
  const hasCustomerId = !!accumulatedData.customer_id || !!accumulatedData.customerId;
  const isCustomerCreation = context.selectedWorkflow === 'hotel_onboarding';
  
  console.log(`  - sessionHotelOptions (final):`, sessionHotelOptions?.length || 0);
  console.log(`🔍 DEBUG: Processing customer field "${field.name}"`);
  console.log(`  - workflow: ${context.selectedWorkflow}`);
  console.log(`  - sessionHotelOptions count: ${sessionHotelOptions?.length || 0}`);
  console.log(`  - isUpdateWorkflow: ${context.isUpdateWorkflow}`);
  console.log(`  - isCreateWorkflow: ${context.isCreateWorkflow}`);
  console.log(`  - hasCustomerId: ${hasCustomerId}`);
  
  // CRITICAL: For update_hotel workflow specifically, ALWAYS show search interface
  // Other workflows (generate_agreement, create_order) should show session options
  if (context.selectedWorkflow === 'update_hotel' && !hasCustomerId) {
    console.log(`✅ update_hotel workflow - showing search interface (ignoring session options)`);
    return {
      ...field,
      type: "lookup",
      label: field.label || "Search Customer to Update",
      required: field.required ?? true,
      defaultValue: undefined,
      api_source: field.api_source || "/api/customers/search",
      value_key: field.value_key || "id",
      label_key: field.label_key || "name",
      placeholder: field.placeholder || "Type to search for a hotel...",
      search_on_frontend: field.search_on_frontend ?? true
    };
  }
  
  // For update_order workflow specifically, ALWAYS show search interface
  if (context.selectedWorkflow === 'update_order' && !hasCustomerId) {
    console.log(`✅ update_order workflow - showing search interface (ignoring session options)`);
    return {
      ...field,
      type: "lookup",
      label: field.label || "Search Customer to Update",
      required: field.required ?? true,
      defaultValue: undefined,
      api_source: field.api_source || "/api/customers/search",
      value_key: field.value_key || "id",
      label_key: field.label_key || "name",
      placeholder: field.placeholder || "Type to search for a customer...",
      search_on_frontend: field.search_on_frontend ?? true
    };
  }
  
  // For CREATE workflows: show session options if available
  if (sessionHotelOptions && sessionHotelOptions.length > 0 && context.isCreateWorkflow) {
    console.log(`✅ CREATE workflow - attaching ${sessionHotelOptions.length} session hotel options with search`);
    return {
      ...field,
      type: "lookup",
      label: field.label || field.name,
      required: field.required ?? true,
      defaultValue: accumulatedData[field.name],
      session_options: sessionHotelOptions,
      options: sessionHotelOptions,
      show_search_option: true,
      api_source: field.api_source || "/api/customers/search",
      value_key: field.value_key || "id",
      label_key: field.label_key || "name",
      placeholder: field.placeholder || "Type to search for a hotel...",
      search_on_frontend: field.search_on_frontend ?? true
    };
  }
  
  // Fallback: show search for any workflow that needs customer selection
  if (!hasCustomerId && !isCustomerCreation) {
    console.log(`✅ Showing search interface for customer selection`);
    return {
      ...field,
      type: "lookup",
      label: field.label || "Search Customer / Hotel",
      required: field.required ?? true,
      defaultValue: undefined,
      api_source: field.api_source || "/api/customers/search",
      value_key: field.value_key || "id",
      label_key: field.label_key || "name",
      placeholder: field.placeholder || "Type to search for a hotel...",
      search_on_frontend: field.search_on_frontend ?? true
    };
  }
  
  // Default: simple field with default value
  console.log(`⚠️ No special handling applied - returning default field config`);
  return {
    ...field,
    type: field.type || "text",
    label: field.label || field.name,
    required: field.required ?? true,
    defaultValue: accumulatedData[field.name]
  };
}

/**
 * Handle dual_multi_select fields with pre-selection from current entity data
 * Currently only used in routes-form for route points
 */
function handleDualMultiSelectField(
  field: any, 
  accumulatedData: any, 
  context: FieldRenderContext
): any {
  if (!field.sections) {
    return field;
  }
  
  const currentEntity = context.currentEntityData || accumulatedData.current_route_data;
  const existingPoints: any[] = currentEntity?.points || [];
  console.log(`📍 Pre-selecting ${existingPoints.length} existing route points`);
  
  const selectedItems: any[] = [];
  
  const resolvedSections = field.sections.map((section: any) => {
    const rawData = accumulatedData[section.options_source] || [];
    const items = Array.isArray(rawData) ? rawData : [];
    
    const preSelectedIds = new Set(
      existingPoints
        .filter((p: any) => p.partyType === section.partyType)
        .map((p: any) => String(p.partyId))
    );
    
    const options = items.slice(0, 20).map((item: any) => {
      const id = String(item[section.value_key || "id"]);
      const name = item[section.label_key || "name"] || `Item ${item.id}`;
      const isSelected = preSelectedIds.has(id);
      if (isSelected) {
        selectedItems.push({ 
          value: id, 
          label: name, 
          partyType: section.partyType 
        });
      }
      return { 
        value: id, 
        label: name, 
        partyType: section.partyType, 
        selected: isSelected 
      };
    });
    
    console.log(`   ${section.label}: ${preSelectedIds.size} pre-selected out of ${items.length}`);
    return { ...section, options, option_count: items.length };
  });
  
  // Set in accumulated_data so the frontend formData init picks it up
  accumulatedData[field.name] = selectedItems;
  console.log(`✅ Set ${selectedItems.length} pre-selected items in accumulated_data.${field.name}`);
  
  return {
    ...field,
    sections: resolvedSections,
    required: field.required ?? true,
    defaultValue: selectedItems,
  };
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

/**
 * Resolve all form fields with type-specific handlers
 * 
 * @param fields - Array of field configurations from workflow config
 * @param accumulatedData - Current accumulated data with fetched values
 * @param context - Workflow and session context for field rendering
 * @returns Array of resolved fields ready for frontend rendering
 */
export function resolveFormFields(
  fields: any[],
  accumulatedData: any,
  context: FieldRenderContext
): any[] {
  return fields.map((field: any) => {
    // 0. Resolve data source from registry if specified
    field = resolveFieldDataSource(field, accumulatedData);
    
    // 1. Check for customer_id field (most complex, check first)
    if (field.name === "customer_id" || field.name === "customerId") {
      return handleCustomerIdField(field, accumulatedData, context);
    }
    
    // 2. Handle dual_multi_select (routes-specific)
    if (field.type === "dual_multi_select") {
      return handleDualMultiSelectField(field, accumulatedData, context);
    }
    
    // 3. Handle dropdown with options_source
    if (field.type === "dropdown" && field.options_source) {
      return handleDropdownField(field, accumulatedData);
    }
    
    // 4. Handle lookup with api_source
    if (field.type === "lookup" && field.api_source) {
      return handleLookupField(field, accumulatedData);
    }
    
    // 5. Handle date/datetime-local with normalization
    if (field.type === "date" || field.type === "datetime-local") {
      return handleDateField(field, accumulatedData);
    }
    
    // 6. Handle simple fields (text, number, textarea, checkbox)
    return handleSimpleField(field, accumulatedData);
  });
}

/**
 * Create a field render context from workflow state
 * Helper function to build the context object from form node state
 */
export function createFieldRenderContext(
  workflowContext: any,
  accumulatedData: any,
  currentEntityData?: any
): FieldRenderContext {
  return {
    workflowType: workflowContext.workflowType,
    selectedWorkflow: workflowContext.selectedWorkflow,
    isUpdateWorkflow: workflowContext.isUpdateWorkflow,
    isCreateWorkflow: workflowContext.isCreateWorkflow,
    sessionOptions: {
      hotels: accumulatedData._session_hotel_options,
      orders: accumulatedData._session_order_options,
      routes: accumulatedData._session_route_options
    },
    currentEntityData
  };
}
