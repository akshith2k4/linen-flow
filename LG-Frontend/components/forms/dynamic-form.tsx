"use client";

import { useState, useEffect } from "react";
import { evaluateMathExpression } from "@/lib/safe-math";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import { Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import React from "react";

interface FormFieldConfig {
  name: string;
  type: string;
  label: string | React.ReactNode;
  placeholder?: string;
  required?: boolean;
  options?: (string | { label: string; value: string })[];
  api_source?: string;
  value_key?: string;
  label_key?: string;
  compute?: string; 
  disabled?: boolean;
  autoFilled?: boolean;
  session_options?: Array<{ value: string; label: string; id: string; name: string; interaction_type?: string }>;
  show_search_option?: boolean;
}

interface FormSchema {
  accumulated_data?: Record<string, any>;
  form: {
    type?: "review" | "standard";
    title?: string;
    description?: string;
    fields?: FormFieldConfig[];
    sections?: Array<{
      title: string;
      fields: Array<{
        name: string;
        label: string;
        value: any;
        editable: boolean;
      }>;
    }>;
    actions?: Array<{
      label: string;
      type: "submit" | "back";
      style: "primary" | "secondary";
    }>;
    submit?: { label: string };
    multiple?: boolean;
    list_key?: string;
    min_entries?: number;
    add_label?: string;
    current_step?: number;
    total_steps?: number;
    layout?: "compact" | "full";
  };
}

interface DynamicFormProps {
  schema: FormSchema;
  onComplete: (data: any, formData?: any) => void;
  disabled?: boolean;
  isLocked?: boolean;
  threadId?: string;
}

// ============================================================================
// DUAL MULTI SELECT COMPONENT
// ============================================================================

interface DualMultiSelectSection {
  key: string;
  label: string;
  options: Array<{ value: string; label: string; partyType: string; selected?: boolean }>;
  option_count?: number;
  api_source?: string | null;
  searchable?: boolean;
  scrollable?: boolean;
  placeholder?: string;
}

interface DualMultiSelectProps {
  sections: DualMultiSelectSection[];
  value: Array<{ value: string; label: string; partyType: string }>;
  onChange: (val: Array<{ value: string; label: string; partyType: string }>) => void;
  disabled?: boolean;
  defaultValue?: string[];
}

function DualMultiSelect({ sections, value, onChange, disabled, defaultValue }: DualMultiSelectProps) {
  const [queries, setQueries] = React.useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = React.useState<Record<string, Array<{ value: string; label: string; partyType: string }>>>({});
  const [searching, setSearching] = React.useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = React.useState(false);

  // Initialize from defaultValue (string array) or option.selected flags — runs once
  React.useEffect(() => {
    if (initialized) return;
    const currentValues = Array.isArray(value) ? value : [];
    if (currentValues.length > 0) { setInitialized(true); return; }

    const preSelected: Array<{ value: string; label: string; partyType: string }> = [];

    for (const section of sections) {
      for (const opt of section.options) {
        const isDefault = defaultValue?.includes(opt.value) || opt.selected;
        if (isDefault) preSelected.push({ value: opt.value, label: opt.label, partyType: opt.partyType });
      }
    }

    if (preSelected.length > 0) onChange(preSelected);
    setInitialized(true);
  }, [sections, defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = Array.isArray(value) ? value : [];

  const isChecked = (optValue: string) => selected.some((s) => s.value === optValue);

  const toggle = (opt: { value: string; label: string; partyType: string }) => {
    if (disabled) return;
    if (isChecked(opt.value)) {
      onChange(selected.filter((s) => s.value !== opt.value));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSearch = async (section: DualMultiSelectSection, query: string) => {
    setQueries((prev) => ({ ...prev, [section.key]: query }));

    if (!query || query.length < 2) {
      setSearchResults((prev) => ({ ...prev, [section.key]: [] }));
      return;
    }

    if (!section.api_source) return;

    setSearching((prev) => ({ ...prev, [section.key]: true }));
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const url = `${backendUrl}${section.api_source}?name=${encodeURIComponent(query)}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "x-company-id": "1" } });
      if (res.ok) {
        const data: any = await res.json();
        const items: any[] = Array.isArray(data) ? data : (data?.content || []);
        const partyType = section.options[0]?.partyType || section.key.toUpperCase();
        setSearchResults((prev) => ({
          ...prev,
          [section.key]: items.map((item) => ({
            value: String(item.id),
            label: item.name || `Item ${item.id}`,
            partyType,
          })),
        }));
      }
    } catch {
      // silently fail — preview options still shown
    } finally {
      setSearching((prev) => ({ ...prev, [section.key]: false }));
    }
  };

  const summary = sections
    .map((sec) => {
      const partyType = sec.options[0]?.partyType || sec.key.toUpperCase();
      const n = selected.filter((s) => s.partyType === partyType).length;
      return n > 0 ? `${n} ${sec.label.toLowerCase()}` : null;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {sections.map((section) => {
          const query = queries[section.key] || "";
          const isSearching = searching[section.key] || false;
          const displayOptions = (query.length >= 2 && searchResults[section.key])
            ? searchResults[section.key]
            : section.options;

          return (
            <div key={section.key} className="flex-1 min-w-0 border border-border/60 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-surface/40 border-b border-border/40 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{section.label}</span>
                {section.option_count !== undefined && (
                  <span className="text-[9px] text-text-muted/60">{section.option_count} total</span>
                )}
              </div>
              {section.searchable && (
                <div className="px-2 pt-2 relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(section, e.target.value)}
                    placeholder={section.placeholder || "Search..."}
                    disabled={disabled}
                    className="w-full text-xs px-2.5 py-1.5 border border-border/60 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-text-muted/60 disabled:opacity-50"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 translate-y-[-2px]">
                      <Loader2 className="animate-spin h-3 w-3 text-text-muted" />
                    </div>
                  )}
                </div>
              )}
              <div className={cn("overflow-y-auto px-2 py-2 space-y-0.5", section.scrollable ? "max-h-48" : "")}>
                {displayOptions.length === 0 ? (
                  <p className="text-[11px] text-text-muted/60 italic px-1 py-2">
                    {query.length >= 2 ? "No results" : "Type to search..."}
                  </p>
                ) : (
                  displayOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs",
                        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-primary/5",
                        isChecked(opt.value) ? "bg-primary/5 text-primary font-medium" : "text-text-body"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked(opt.value)}
                        onChange={() => toggle(opt)}
                        disabled={disabled}
                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[11px] text-text-muted">
          Selected: {summary} ({selected.length} stop{selected.length !== 1 ? "s" : ""} total)
        </p>
      )}
    </div>
  );
}

export function DynamicForm({ schema, onComplete, disabled, isLocked, threadId }: DynamicFormProps) {
  const isReviewForm = schema.form.type === "review";
  const isMultiEntry = schema.form.multiple === true;
  const accumulatedData = schema.accumulated_data || {};
  const listKey = schema.form.list_key || "entries";
  const minEntries = schema.form.min_entries || 1;

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    // 🛡️ PRESERVE SUBMITTED DATA: If the form is locked/completed, use accumulated_data
    // to show what the user actually typed, not the placeholder values
    if (disabled || isLocked) {
      return schema.accumulated_data || {};
    }
    return {};
  });
  const [entries, setEntries] = useState<Record<string, any>[]>([{}]);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState<Record<string, boolean>>({});
  const [activeEntryIndex, setActiveEntryIndex] = useState<number>(0);
  const [showSearchForField, setShowSearchForField] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fieldsWithCompute = (schema.form.fields || []).filter((f: any) => f.compute);
    if (fieldsWithCompute.length === 0) return;

    if (isMultiEntry) {
      let changed = false;
      const newEntries = entries.map((entry) => {
        let entryChanged = false;
        const newEntry = { ...entry };

        fieldsWithCompute.forEach((field: any) => {
          const formula = field.compute!;
          const deps = (schema.form.fields || []).map(f => f.name);
          let result: any = formula;
          
          let allDepsPresent = true;
          deps.forEach(dep => {
            if (formula.includes(dep)) {
              const val = parseFloat(newEntry[dep] || 0);
              result = result.replace(new RegExp(dep, 'g'), val);
              if (newEntry[dep] === undefined) allDepsPresent = false;
            }
          });

          if (allDepsPresent) {
            try {
              const calculatedValue = evaluateMathExpression(result);
              
              if (!isNaN(calculatedValue) && newEntry[field.name] !== calculatedValue) {
                newEntry[field.name] = calculatedValue;
                entryChanged = true;
                changed = true;
              }
            } catch (e) {
              console.error("Formula evaluation failed", e);
            }
          }
        });
        return entryChanged ? newEntry : entry;
      });

      if (changed) setEntries(newEntries);
    } else {
      let changed = false;
      const newFormData = { ...formData };

      fieldsWithCompute.forEach((field: any) => {
        const formula = field.compute!;
        const deps = (schema.form.fields || []).map(f => f.name);
        let result: any = formula;
        
        let allDepsPresent = true;
        deps.forEach(dep => {
          if (formula.includes(dep)) {
            const val = parseFloat(newFormData[dep] || 0);
            result = result.replace(new RegExp(dep, 'g'), val);
            if (newFormData[dep] === undefined) allDepsPresent = false;
          }
        });

        if (allDepsPresent) {
          try {
            const calculatedValue = evaluateMathExpression(result);
            if (!isNaN(calculatedValue) && newFormData[field.name] !== calculatedValue) {
              newFormData[field.name] = calculatedValue;
              changed = true;
            }
          } catch (e) {
            console.error("Formula evaluation failed", e);
          }
        }
      });

      if (changed) setFormData(newFormData);
    }
  }, [formData, entries, isMultiEntry, schema.form.fields]);

  // Auto-fill date logic for create_order workflow
  useEffect(() => {
    const leasingOrderType = formData.leasingOrderType;
    if (!leasingOrderType) return;

    if (leasingOrderType === 'PICKUP' && formData.pickupDate && formData.pickupDate !== formData.deliveryDate) {
      setFormData(prev => ({ ...prev, deliveryDate: formData.pickupDate }));
    } else if (leasingOrderType === 'DELIVERY' && formData.deliveryDate && formData.deliveryDate !== formData.pickupDate) {
      setFormData(prev => ({ ...prev, pickupDate: formData.deliveryDate }));
    }
  }, [formData.leasingOrderType, formData.pickupDate, formData.deliveryDate]);

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});

  // ★ BUG FIX 2: Flatten nested objects from accumulated_data into dot-notation
  // e.g., { billingAddress: { city: "Hyderabad" } } → { "billingAddress.city": "Hyderabad" }
  const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      // Don't recurse into arrays — keep them as-is
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  };

  useEffect(() => {
    const initialData: Record<string, any> = {};

    if (isReviewForm && schema.form.sections) {
      schema.form.sections.forEach(section => {
        section.fields.forEach(field => {
          initialData[field.name] = field.value;
        });
      });
    } else if (!isMultiEntry && schema.form.fields) {
      // Initialize standard form with defaultValues
      schema.form.fields.forEach(field => {
        if ((field as any).defaultValue !== undefined) {
          initialData[field.name] = (field as any).defaultValue;
        }
      });
      
      // ★ BUG FIX 2: Flatten accumulated_data to match dot-notation field names
      // This ensures that nested objects like { billingAddress: { city: "X" } }
      // are converted to { "billingAddress.city": "X" } so inputs can display them
      // Skip keys that were already set from defaultValue (e.g. dual_multi_select arrays)
      if (accumulatedData && Object.keys(accumulatedData).length > 0) {
        const flattenedData = flattenObject(accumulatedData);
        for (const [k, v] of Object.entries(flattenedData)) {
          if (!(k in initialData)) {
            initialData[k] = v;
          }
        }
      }
    }
    
    setFormData(initialData);

    // Initialize multi-entry form with existing data or defaults
    if (isMultiEntry && schema.form.fields) {
      const listKey = schema.form.list_key || "entries";
      const defaultsKey = `${listKey}_defaults`;
      
      console.log(`[Form] Multi-entry initialization:`);
      console.log(`  - listKey: ${listKey}`);
      console.log(`  - defaultsKey: ${defaultsKey}`);
      console.log(`  - accumulatedData keys:`, Object.keys(accumulatedData));
      console.log(`  - accumulatedData[${defaultsKey}]:`, accumulatedData[defaultsKey]);
      
      // Check if we have pre-filled defaults from the backend
      if (accumulatedData[defaultsKey] && Array.isArray(accumulatedData[defaultsKey])) {
        console.log(`[Form] ✅ Pre-filling multi-entry form with ${accumulatedData[defaultsKey].length} existing entries`);
        console.log(`[Form] First entry:`, JSON.stringify(accumulatedData[defaultsKey][0], null, 2));
        setEntries(accumulatedData[defaultsKey]);
      } else {
        console.log(`[Form] ⚠️ No ${defaultsKey} found, using field defaults`);
        // Otherwise, initialize with field defaults if available
        const entryDefaults: Record<string, any> = {};
        schema.form.fields.forEach(field => {
          if ((field as any).defaultValue !== undefined) {
            entryDefaults[field.name] = (field as any).defaultValue;
          }
        });
        if (Object.keys(entryDefaults).length > 0) {
          setEntries([entryDefaults]);
        }
      }
    }

    // Fetch dropdown options from API if api_source is provided
    const fetchDropdownOptions = async () => {
      const fields = schema.form.fields || [];
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:";
      
      for (const field of fields) {
        // Skip if already have options from schema OR we already fetched them for this field
        if (field.type === "dropdown" && field.api_source && (!field.options || field.options.length === 0) && !dropdownOptions[field.name]) {
          try {
            // Replace template variables in api_source (e.g., {{accumulated_data.inventoryPoolId}})
            let apiSource = field.api_source;
            const templateMatches = apiSource.match(/\{\{([^}]+)\}\}/g);
            let allResolved = true;
            
            if (templateMatches) {
              for (const match of templateMatches) {
                const path = match.slice(2, -2).trim(); // Remove {{ }}
                
                // Extract the value from accumulated_data
                if (path.startsWith('accumulated_data.')) {
                  const key = path.replace('accumulated_data.', '');
                  const value = accumulatedData?.[key];
                  
                  if (value !== undefined && value !== null) {
                    apiSource = apiSource.replace(match, String(value));
                  } else {
                    console.warn(`[Dropdown] Template variable ${match} not found in accumulated_data, waiting for data...`);
                    allResolved = false;
                  }
                }
              }
            }

            if (!allResolved) {
              continue; // Don't fetch if URL is not fully resolved
            }
            
            // Construct the full URL - if api_source starts with /, prepend backend URL
            const apiUrl = apiSource.startsWith('/') 
              ? `${backendUrl}${apiSource}`
              : apiSource;
            
            console.log(`[Dropdown] Fetching options for "${field.name}" from ${apiUrl}`);
            
            const response = await axios.get(apiUrl, {
              headers: {
                'x-company-id': '1'
              }
            });
            
            let results = response.data;
            if (results && results.content) {
              results = results.content;
            } else if (!Array.isArray(results)) {
              results = [];
            }
            
            console.log(`[Dropdown] Fetched ${results.length} options for "${field.name}"`);
            setDropdownOptions(prev => ({ ...prev, [field.name]: results }));
          } catch (error) {
            console.error(`[Dropdown] Failed to fetch options for "${field.name}":`, error);
            setDropdownOptions(prev => ({ ...prev, [field.name]: [] }));
          }
        }
      }
    };

    fetchDropdownOptions();
  }, [schema, schema.accumulated_data]); // Depend on the property directly to avoid infinite loops from local object redefinition

  // Auto-skip steps that have no fields to render (e.g., heavily filtered update forms)
  useEffect(() => {
    if (!disabled && !isEditing && schema.form.fields && schema.form.fields.length === 0 && !isReviewForm) {
      const submitData = isMultiEntry ? { [listKey]: [] } : {};
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      
      setStatus("submitting");
      
      axios.post(`${backendUrl}/api/form-submit`, {
        formData: submitData,
        thread_id: threadId,
      }).then(res => {
        setStatus("done");
        onComplete(res.data, submitData);
      }).catch(err => {
        console.error("Auto-submission failed", err);
        setStatus("idle");
      });
    }
  }, [schema.form.fields, disabled, isEditing, isReviewForm, isMultiEntry, listKey, threadId, onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow submission if it's a new step with session hotel selection
    const hasSessionOptions = (schema.form.fields || []).some(f => 
      f.type === "lookup" && f.session_options && f.session_options.length > 0
    );
    
    console.log('[Form Submit] Checking submission eligibility:', {
      disabled,
      isEditing,
      hasSessionOptions,
      isFormCompleted,
      isLocked,
      canSubmit: !disabled || isEditing || hasSessionOptions
    });
    
    // Block submission only if disabled AND not editing AND no session options available
    if (disabled && !isEditing && !hasSessionOptions) {
      console.log('[Form Submit] ❌ Submission blocked - form is disabled');
      return;
    }
    
    console.log('[Form Submit] ✅ Proceeding with submission');

    setStatus("submitting");
    setErrors({});

    // Validate multi-entry forms
    if (isMultiEntry) {
      console.log(`[Form] Validating multi-entry form with ${entries.length} entries`);
      console.log(`[Form] Entries data:`, JSON.stringify(entries, null, 2));
      
      const validationErrors: Record<string, string> = {};
      entries.forEach((entry, index) => {
        console.log(`[Form] Validating entry ${index}:`, entry);
        (schema.form.fields || []).forEach((field) => {
          const value = entry[field.name];
          console.log(`  - Field "${field.name}": value="${value}", required=${field.required}`);
          // ★ BUG FIX 2: Check for null, undefined, or empty string specifically (not falsy)
          // This prevents 0 from being treated as invalid
          if (field.required && (value === undefined || value === null || value === "")) {
            validationErrors[`${index}.${field.name}`] = `${field.label} is required`;
            console.log(`    ❌ Validation failed: ${field.label} is required`);
          }
        });
      });

      // 🛡️ DUPLICATE DETECTION: Check for duplicate product+serviceType combinations
      const hasProductAndService = entries.some(e => e.productId && e.serviceType);
      if (hasProductAndService) {
        const seen = new Set<string>();
        entries.forEach((entry, index) => {
          if (entry.productId && entry.serviceType) {
            const key = `${entry.productId}-${entry.serviceType}`;
            if (seen.has(key)) {
              validationErrors[`${index}.productId`] = `Duplicate product with same service type`;
              validationErrors[`${index}.serviceType`] = `This combination already exists`;
              console.log(`    ❌ Duplicate detected: Product ${entry.productId} with service type ${entry.serviceType}`);
            }
            seen.add(key);
          }
        });
      }

      if (Object.keys(validationErrors).length > 0) {
        console.error(`[Form] Validation failed with ${Object.keys(validationErrors).length} errors:`);
        Object.entries(validationErrors).forEach(([key, message]) => {
          console.error(`  - ${key}: ${message}`);
        });
        setErrors(validationErrors);
        setStatus("idle");
        return;
      }
      
      console.log(`[Form] ✅ Validation passed`);
    }

    try {
      // ★ CRITICAL FIX: Convert dot notation keys to nested objects
      // e.g., "billingAddress.addressLine1" → { billingAddress: { addressLine1: value } }
      const convertDotNotationToNested = (flatData: Record<string, any>): Record<string, any> => {
        const nested: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(flatData)) {
          if (key.includes('.')) {
            // Split the key and create nested structure
            const parts = key.split('.');
            let current = nested;
            
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) {
                current[parts[i]] = {};
              }
              current = current[parts[i]];
            }
            
            current[parts[parts.length - 1]] = value;
          } else {
            // Keep flat keys as-is
            nested[key] = value;
          }
        }
        
        return nested;
      };
      
      const rawSubmitData = isMultiEntry ? { [listKey]: entries } : formData;
      const submitData = isMultiEntry 
        ? { [listKey]: entries.map(convertDotNotationToNested) }
        : convertDotNotationToNested(formData);
      
      console.log('[Form Submit] 🔄 Converted dot notation to nested:', {
        before: rawSubmitData,
        after: submitData
      });

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Detect search form by the submit label
      const isSearchForm = schema.form.submit?.label === "View Details";
      
      if (isEditing && isFormCompleted) {
        await axios.post(`${backendUrl}/api/form-edit`, {
          formData: submitData,
          thread_id: threadId,
        });
        setIsEditing(false);
        setEditMode({});
        setStatus("done");
      } else if (isSearchForm) {
        // Search form: route to search-submit
        const res = await axios.post(`${backendUrl}/api/search-submit`, {
          formData: submitData,
          thread_id: threadId,
        });
        setStatus("done");
        onComplete(res.data, submitData);
      } else {
        const res = await axios.post(`${backendUrl}/api/form-submit`, {
          formData: submitData,
          thread_id: threadId,
        });
        setStatus("done");
        onComplete(res.data, submitData);
      }
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("idle");
    }
  };

  const handleBack = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    axios.post(`${backendUrl}/api/chat`, {
      message: "go back",
      thread_id: threadId,
    }).then((res) => {
      onComplete(res.data, null);
    });
  };

  const toggleEdit = (fieldName: string) => {
    setEditMode(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const addEntry = () => {
    const newIndex = entries.length;
    setEntries([...entries, {}]);
    setActiveEntryIndex(newIndex);
  };

  const removeEntry = (index: number) => {
    if (entries.length > minEntries) {
      const newEntries = entries.filter((_, i) => i !== index);
      setEntries(newEntries);
      if (activeEntryIndex >= newEntries.length) {
        setActiveEntryIndex(newEntries.length - 1);
      }
    }
  };

  const updateEntry = (index: number, field: string, value: any) => {
    console.log(`[Form] Updating entry ${index}, field "${field}" to:`, value, `(type: ${typeof value})`);
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    console.log(`[Form] Entry ${index} after update:`, updated[index]);
    setEntries(updated);
  };

  const isFormCompleted = status === "done" || disabled;
  
  // Check if we have session hotel options that need user input
  const hasSessionOptions = (schema.form.fields || []).some(f => 
    f.type === "lookup" && f.session_options && f.session_options.length > 0
  );
  
  // Don't disable the form if we have session options (new step requiring input)
  const isDisabled = (isFormCompleted || isLocked) && !isEditing && !hasSessionOptions;

  // Search handler for lookup fields
  const handleSearch = async (fieldName: string, query: string, apiSource: string) => {
    setSearchQuery(prev => ({ ...prev, [fieldName]: query }));
    
    if (!query || query.length < 2) {
      setSearchResults(prev => ({ ...prev, [fieldName]: [] }));
      return;
    }

    setIsSearching(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Determine if this is a customer search or other API
      let response;
      const fullUrl = apiSource.startsWith('/') ? `${backendUrl}${apiSource}` : apiSource;
      
      response = await axios.get(fullUrl, {
        params: { 
          name: query,
          search: query,
          q: query 
        },
        headers: {
          'x-company-id': '1'
        }
      });
      
      console.log("Search results:", response.data);
      
      // Handle different response formats
      let results = response.data;
      if (results && results.content) {
        // Paginated response
        results = results.content;
      } else if (!Array.isArray(results)) {
        results = [];
      }
      
      setSearchResults(prev => ({ ...prev, [fieldName]: results }));
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults(prev => ({ ...prev, [fieldName]: [] }));
    } finally {
      setIsSearching(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const selectSearchResult = (fieldName: string, result: any, valueKey: string = "id", labelKey: string = "name", onChangeCallback: (val: any) => void) => {
    onChangeCallback(result[valueKey]);
    setSearchQuery(prev => ({ ...prev, [fieldName]: result[labelKey] || result[valueKey] }));
    setSearchResults(prev => ({ ...prev, [fieldName]: [] }));
  };

  const renderField = (field: FormFieldConfig, value: any, onChange: (val: any) => void, errorKey?: string) => {
    // Check if this is an auto-filled date field
    const isAutoFilledDate = field.autoFilled && (field.name === 'pickupDate' || field.name === 'deliveryDate');
    
    // Dual multi-select (side-by-side searchable checkbox lists)
    if (field.type === "dual_multi_select" && (field as any).sections) {
      return (
        <DualMultiSelect
          sections={(field as any).sections}
          value={value || []}
          onChange={onChange}
          disabled={isDisabled}
          defaultValue={(field as any).defaultValue}
        />
      );
    }

    // Lookup field with session options (smart hotel selection with radio buttons)
    if (field.type === "lookup" && field.api_source && field.session_options && field.session_options.length > 0 && !showSearchForField[field.name]) {
      // For session hotel selection, we should NOT be disabled even if form is completed
      // This is a NEW step that needs user input
      const isRadioDisabled = field.disabled || false;
      
      return (
        <div className="space-y-3">
          <div className="text-xs text-text-muted mb-3">
            Select a hotel from your recent session or search for a different one:
          </div>
          <div className="space-y-2">
            {field.session_options.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex items-center p-3 border rounded-lg transition-all duration-200",
                  isRadioDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                  value === option.id 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border/60 hover:border-primary/30 hover:bg-primary/5"
                )}
                onClick={(e) => {
                  // Handle click on the entire label for better UX
                  if (!isRadioDisabled && value !== option.id) {
                    onChange(option.id);
                  }
                }}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => {
                    console.log('[Radio] onChange triggered:', e.target.value);
                    onChange(e.target.value);
                  }}
                  disabled={isRadioDisabled}
                  className="w-4 h-4 text-primary border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                <div className="flex items-center justify-between flex-1 ml-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-heading text-sm">
                      {option.name}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5">
                      ID: {option.id}
                    </div>
                  </div>
                  {option.interaction_type && (
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ml-2",
                      option.interaction_type === 'created' && "bg-emerald-100 text-emerald-700",
                      option.interaction_type === 'updated' && "bg-blue-100 text-blue-700",
                      option.interaction_type === 'viewed' && "bg-purple-100 text-purple-700"
                    )}>
                      {option.interaction_type}
                    </span>
                  )}
                </div>
              </label>
            ))}
            {field.show_search_option && (
              <button
                type="button"
                onClick={() => setShowSearchForField(prev => ({ ...prev, [field.name]: true }))}
                disabled={isRadioDisabled}
                className="w-full p-3 border-2 border-dashed border-border/60 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-center group cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="text-sm font-medium text-text-muted group-hover:text-primary transition-colors">
                  Search for a different hotel
                </div>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Lookup field with search (standard or when user clicked "search for different")
    if (field.type === "lookup" && field.api_source) {
      const results = searchResults[field.name] || [];
      const query = searchQuery[field.name] || "";
      const searching = isSearching[field.name] || false;
      const labelKey = field.label_key || "name";
      const valueKey = field.value_key || "id";

      return (
        <div className="relative">
          <SearchInput
            value={query}
            onChange={(e) => handleSearch(field.name, e.target.value, field.api_source!)}
            placeholder={field.placeholder || "Type to search..."}
            disabled={isDisabled}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin h-4 w-4 text-text-muted" />
            </div>
          )}
          {results.length > 0 && (
            <div className="absolute z-50 w-full mt-1.5 bg-white border border-border/60 rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.06)] max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1.5 space-y-0.5">
                {results.map((result: any) => (
                  <button
                    key={result[valueKey]}
                    type="button"
                    onClick={() => selectSearchResult(field.name, result, valueKey, labelKey, onChange)}
                    className="flex flex-col w-full text-left px-3 py-2 hover:bg-primary/5 rounded-lg transition-colors group"
                  >
                    <div className="font-semibold text-text-heading text-sm group-hover:text-primary transition-colors">{result[labelKey]}</div>
                    {result[valueKey] && <div className="text-[11px] font-mono text-text-muted mt-0.5 opacity-80">ID: {result[valueKey]}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (field.type === "dropdown") {
      // Get options from either static config or fetched API data
      let optionsList = field.options || [];
      
      if (field.api_source && dropdownOptions[field.name]) {
        const apiData = dropdownOptions[field.name];
        const valueKey = field.value_key || "id";
        const labelKey = field.label_key || "name";
        
        optionsList = apiData.map((item: any) => ({
          label: item[labelKey],
          value: String(item[valueKey])
        }));
      }
      
      return (
        <Select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          error={errorKey ? !!errors[errorKey] : false}
          disabled={isDisabled}
        >
          <option value="">{field.placeholder || `Select ${field.label}...`}</option>
          {/* Deduplicate options to prevent duplicate key errors if API returns redundant data */}
          {Array.from(new Map(optionsList.map(opt => [typeof opt === "string" ? opt : opt.value, opt])).values()).map((opt: any, idx) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt.replace(/_/g, " ") : opt.label;
            return (
              <option key={`${optValue}-${idx}`} value={optValue}>
                {optLabel}
              </option>
            );
          })}
        </Select>
      );
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          error={errorKey ? !!errors[errorKey] : false}
          rows={4}
          disabled={isDisabled}
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-border"
          disabled={isDisabled}
        />
      );
    }

    return (
      <Input
        type={field.type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        error={errorKey ? !!errors[errorKey] : false}
        disabled={isDisabled}
        autoFilled={isAutoFilledDate}
      />
    );
  };

  // Compact single-field layout: render as a slim pill/inline card
  const isCompactSingleField = schema.form.layout === "compact" && 
    !isMultiEntry && 
    (schema.form.fields || []).length === 1;

  if (isCompactSingleField) {
    const field = schema.form.fields![0];
    const value = formData[field.name];
    const onChange = (val: any) => setFormData(prev => ({ ...prev, [field.name]: val }));

    return (
      <div className={cn(
        "w-full max-w-[480px] rounded-xl border transition-all duration-300",
        isFormCompleted
          ? "bg-emerald-50/60 border-emerald-200/60"
          : "bg-white border-border shadow-sm"
      )}>
        {/* Progress bar */}
        {!isFormCompleted && (schema.form.total_steps ?? 0) > 0 && (
          <div className="h-0.5 w-full bg-primary/10 rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((schema.form.current_step ?? 1) / (schema.form.total_steps ?? 1)) * 100}%` }}
            />
          </div>
        )}

        <div className="px-4 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-heading">{schema.form.title}</span>
              {!isFormCompleted && (schema.form.total_steps ?? 0) > 0 && (
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                  Step {schema.form.current_step ?? 1} of {schema.form.total_steps ?? 1}
                </span>
              )}
            </div>
            {isFormCompleted && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-widest rounded-full border border-emerald-200">
                <CheckCircle2 size={10} className="text-emerald-600" />
                Completed
              </div>
            )}
          </div>

          {/* Inline input + submit row */}
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {renderField(
                  { ...field, disabled: isDisabled },
                  isFormCompleted ? (value ?? "") : value,
                  onChange,
                  field.name
                )}
              </div>
              {!isFormCompleted && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={isDisabled || status === "submitting" || !value}
                  className="shrink-0 bg-primary hover:bg-primary/90 text-white h-9 px-4 text-xs font-medium shadow-sm rounded-lg"
                >
                  {status === "submitting" ? (
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                  ) : (
                    <span className="flex items-center gap-1">Next <span className="text-base leading-none">&rarr;</span></span>
                  )}
                </Button>
              )}
            </div>
            {errors[field.name] && (
              <p className="text-xs text-destructive mt-1">{errors[field.name]}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "w-full shadow-sm border-border bg-white transition-all duration-500",
      "max-w-[480px]"
    )}>
      {schema.form.title && (
        <CardHeader className={cn(
          "border-b border-border py-3 px-4 transition-colors duration-500 relative",
          isFormCompleted ? "bg-emerald-50/50" : "bg-primary/5",
          schema.form.layout === "compact" ? "text-center" : ""
        )}>
          {/* Progress Bar */}
          {!isFormCompleted && (schema.form.total_steps ?? 0) > 0 && (
            <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/10">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out" 
                style={{ width: `${((schema.form.current_step ?? 1) / (schema.form.total_steps ?? 1)) * 100}%` }}
              />
            </div>
          )}

          <div className={cn(
            "flex items-center justify-between",
            schema.form.layout === "compact" ? "flex-col gap-1.5" : ""
          )}>
            <div className={cn(
              "flex-1 min-w-0",
              schema.form.layout === "compact" ? "flex flex-col items-center" : ""
            )}>
              <div className="flex items-center gap-2 mb-0.5">
                <CardTitle className="text-sm font-semibold text-text-heading">{schema.form.title}</CardTitle>
                {!isFormCompleted && (schema.form.total_steps ?? 0) > 0 && (
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                    Step {schema.form.current_step ?? 1} of {schema.form.total_steps ?? 1}
                  </span>
                )}
              </div>
              {schema.form.description && (
                <p className="text-[11px] text-text-muted mt-0.5 truncate">{schema.form.description}</p>
              )}
            </div>
            {isFormCompleted && (
               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-widest rounded-full border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-right-2 duration-500">
                 <CheckCircle2 size={11} className="text-emerald-600" />
                 Completed
               </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={schema.form.title ? "p-4" : "p-3 pb-3"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isMultiEntry ? (
            <div className="space-y-2.5">
              {entries.map((entry, index) => {
                const isActive = index === activeEntryIndex;
                const entryTitle = schema.form.add_label ? schema.form.add_label.replace('Add ', '') : 'Entry';
                
                // Try to find a meaningful summary for the compressed view
                let resolvedProductName = "";
                if (entry.productId && dropdownOptions["productId"]) {
                  const fieldDef = (schema.form.fields || []).find((f: any) => f.name === "productId");
                  const valKey = fieldDef?.value_key || "id";
                  const lblKey = fieldDef?.label_key || "name";
                  const opt = dropdownOptions["productId"].find((o: any) => String(o[valKey]) === String(entry.productId) || String(o.value) === String(entry.productId));
                  if (opt) resolvedProductName = opt[lblKey] || opt.label;
                }

                // Show name, email or other identifying info
                const summaryValue = resolvedProductName || entry.name || entry.label || entry.title || 
                                   (entry.contactName ? `${entry.contactName} (${entry.contactEmail || ''})` : '') ||
                                   (entry.productId ? `Product ${entry.productId}` : '');

                return (
                  <div 
                    key={index} 
                    className={cn(
                      "border rounded-lg transition-all duration-300 overflow-hidden mb-2 last:mb-0",
                      isActive 
                        ? "p-3 border-primary/30 bg-primary/[0.02] shadow-sm" 
                        : "p-2 border-border/60 bg-surface/5 hover:bg-surface/10 cursor-pointer"
                    )}
                    onClick={() => !isActive && setActiveEntryIndex(index)}
                  >
                    <div className={cn(
                      "flex items-center justify-between transition-all",
                      isActive ? "mb-3" : ""
                    )}>
                      <div className="flex items-center flex-1 min-w-0">
                        <span className={cn(
                          "w-5 h-5 rounded-full inline-flex items-center justify-center mr-2 text-[9px] font-bold transition-colors",
                          isActive ? "bg-primary text-white" : "bg-text-muted/20 text-text-muted"
                        )}>
                          {index + 1}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider transition-colors",
                            isActive ? "text-primary" : "text-text-muted"
                          )}>
                            {entryTitle}
                          </span>
                          {!isActive && summaryValue && (
                            <span className="text-[11px] font-medium text-text-heading truncate max-w-[200px] animate-in fade-in slide-in-from-left-1 duration-300">
                              {summaryValue}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {entries.length > minEntries && !isDisabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEntry(index);
                            }}
                            className="h-6 w-6 p-0 opacity-40 hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-full"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                        {!isActive && !isDisabled && (
                          <div className="text-[9px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-full uppercase tracking-tighter">
                            Edit
                          </div>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2.5 gap-y-3 animate-in fade-in fill-mode-forwards duration-300 zoom-in-95">
                        {(schema.form.fields || []).map((field) => (
                          <div key={field.name} className={(schema.form.fields || []).length === 1 ? "col-span-1 md:col-span-2" : "col-span-1"}>
                            <FormField
                              label={
                                <div className="flex items-center gap-2">
                                  {field.label}
                                  {field.compute && (
                                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded uppercase tracking-tighter">Auto</span>
                                  )}
                                </div>
                              }
                              required={field.required}
                              error={errors[`${index}.${field.name}`]}
                            >
                              {renderField(
                                { ...field, disabled: !!field.compute || field.disabled }, 
                                entry[field.name],
                                (val) => updateEntry(index, field.name, val),
                                `${index}.${field.name}`
                              )}
                            </FormField>
                            {errors[`${index}.${field.name}`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`${index}.${field.name}`]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEntry}
                className="w-full border-dashed border-border hover:bg-surface/40 text-text-muted hover:text-text-heading h-9 shadow-sm"
              >
                <Plus size={14} className="mr-1.5" />
                {schema.form.add_label || "Add Entry"}
              </Button>
            </div>
          ) : isReviewForm && schema.form.sections ? (
            <div className="space-y-6">
              {schema.form.sections.map((sec, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest border-b border-border/50 pb-2 mb-2">{sec.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sec.fields.map((field, fIdx) => (
                      <div key={fIdx} className="bg-surface/40 p-3 rounded-lg border border-border/60 flex justify-between items-center group transition-colors hover:bg-surface/80">
                        <div className="flex-1 min-w-0 pr-2">
                          <label className="block text-[9px] uppercase font-bold text-text-muted/80 tracking-widest mb-1">{field.label}</label>
                          {(editMode[field.name] || isEditing) ? (
                            <Input
                              value={formData[field.name] || ""}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="h-7 text-xs px-2 w-full mt-0.5 bg-white border-primary/50 shadow-inner"
                              disabled={isDisabled}
                            />
                          ) : (
                            <div className="text-sm font-medium text-text-heading/90 mt-0.5 truncate">
                              {formData[field.name] ? formData[field.name] : <span className="text-text-muted/60 italic text-xs">Not provided</span>}
                            </div>
                          )}
                        </div>
                        {field.editable && !isDisabled && (
                          <Button
                            variant={editMode[field.name] ? "primary" : "secondary"}
                            size="sm"
                            type="button"
                            onClick={() => toggleEdit(field.name)}
                            className={`h-6 text-[10px] uppercase font-bold px-2.5 shadow-sm transition-opacity ${editMode[field.name] ? 'opacity-100 bg-[#3B8246] text-white hover:bg-[#2e6e37]' : 'opacity-0 group-hover:opacity-100 bg-white border border-border text-text-body hover:bg-surface'}`}
                          >
                            {editMode[field.name] ? "Save" : "Edit"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2.5 gap-y-3">
              {(schema.form.fields || [])
                .map((field) => {
                  const leasingOrderType = formData.leasingOrderType;
                  let fieldConfig = { ...field };
                  
                  // Smart date field handling based on leasingOrderType - only for create_order workflow
                  if (leasingOrderType && (field.name === 'pickupDate' || field.name === 'deliveryDate')) {
                    if (leasingOrderType === 'PICKUP') {
                      // PICKUP only: pickupDate is editable, deliveryDate auto-fills and is readonly
                      if (field.name === 'deliveryDate') {
                        fieldConfig.disabled = true;
                        fieldConfig.autoFilled = true;
                      }
                    } else if (leasingOrderType === 'DELIVERY') {
                      // DELIVERY only: deliveryDate is editable, pickupDate auto-fills and is readonly
                      if (field.name === 'pickupDate') {
                        fieldConfig.disabled = true;
                        fieldConfig.autoFilled = true;
                      }
                    }
                    // BOTH: both fields are editable (no changes needed)
                  }
                  
                  return (
                    <div key={field.name} className={(schema.form.fields || []).length === 1 || field.type === "dual_multi_select" ? "col-span-1 md:col-span-2" : "col-span-1"}>
                      <FormField
                        label={
                          <div className="flex items-center gap-2">
                            {field.label}
                            {field.compute && (
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded uppercase tracking-tighter">Auto</span>
                            )}
                            {fieldConfig.autoFilled && (field.name === 'pickupDate' || field.name === 'deliveryDate') && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1 py-0.5 rounded uppercase tracking-tighter">Auto-filled</span>
                            )}
                          </div>
                        }
                        required={field.required}
                        error={errors[field.name]}
                      >
                        {renderField(
                          fieldConfig,
                          formData[field.name],
                          (val) => {
                            setFormData((prev) => ({ ...prev, [field.name]: val }));
                          },
                          field.name
                        )}
                      </FormField>
                    </div>
                  );
                })}
            </div>
          )}

          <div className={cn(
            "pt-2.5 flex items-center justify-between border-t border-border/40 mt-3",
            schema.form.layout === "compact" ? "flex-col-reverse gap-3 pt-4" : "h-9"
          )}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => alert("The Help Center is currently unavailable. Please reach out to your LinenGrass administrator if you are permanently stuck.")}
              className={cn(
                "text-destructive font-medium px-2 gap-1.5 hover:text-destructive hover:bg-destructive/10 h-7 text-xs",
                schema.form.layout === "compact" ? "opacity-50 hover:opacity-100" : ""
              )}
            >
              <span className="text-destructive font-bold text-sm leading-none bg-destructive/10 rounded-full w-4 h-4 flex items-center justify-center">?</span> Help
            </Button>

            <div className={cn(
              "flex items-center gap-2",
              schema.form.layout === "compact" ? "w-full flex-col" : ""
            )}>
              {/* Allow global edit for Review forms even before submission - Hide if permanently locked */}
              {((isFormCompleted) || (isReviewForm && !isFormCompleted)) && !isEditing && !isLocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "h-7 px-3 text-xs font-medium border-border hover:bg-surface text-text-body transition-colors",
                    schema.form.layout === "compact" ? "w-full py-4 text-sm" : ""
                  )}
                >
                  {isFormCompleted ? "Edit" : "Edit All"}
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isDisabled || status === "submitting"}
                className={cn(
                  isDisabled
                    ? "bg-muted text-muted-foreground shadow-none h-7 px-3 text-xs opacity-70"
                    : "bg-primary hover:bg-primary/90 text-white shadow-sm h-7 px-3 text-xs font-medium",
                  schema.form.layout === "compact" ? "w-full py-4 text-sm h-auto" : ""
                )}
              >
                {status === "submitting" ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                    Submitting
                  </span>
                ) : isDisabled ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Step Complete
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {isEditing
                      ? (isFormCompleted ? "Update" : "Save Changes")
                      : (schema.form.submit?.label || "Submit")
                    } <span className="text-base leading-none">&rarr;</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
