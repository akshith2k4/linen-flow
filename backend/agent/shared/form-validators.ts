/**
 * Form Validation Utility
 * Centralized validation logic for form data across workflows
 */

import { formatValidationError, formatValidationErrors, ErrorResponse } from '../../lib/error-formatter';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: any }>;
}

/**
 * Validates required fields in data object
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): ErrorResponse | null {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    return formatValidationErrors(
      missingFields.map(field => ({
        field,
        message: 'This field is required'
      }))
    );
  }
  
  return null;
}

/**
 * Validates a single field against a rule
 */
function validateField(_field: string, value: any, rule: ValidationRule): string | null {
  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    return 'This field is required';
  }
  
  // Skip other validations if value is empty and not required
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }
  
  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return 'Must be a string';
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return 'Must be a valid number';
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return 'Must be a boolean';
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return 'Must be an array';
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return 'Must be an object';
        }
        break;
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          return 'Must be a valid date';
        }
        break;
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(String(value))) {
          return 'Must be a valid email address';
        }
        break;
    }
  }
  
  // Min/Max validation for numbers
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `Must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return `Must be at most ${rule.max}`;
    }
  }
  
  // Min/Max validation for strings (length)
  if (rule.type === 'string' && typeof value === 'string') {
    if (rule.min !== undefined && value.length < rule.min) {
      return `Must be at least ${rule.min} characters`;
    }
    if (rule.max !== undefined && value.length > rule.max) {
      return `Must be at most ${rule.max} characters`;
    }
  }
  
  // Min/Max validation for arrays (length)
  if (rule.type === 'array' && Array.isArray(value)) {
    if (rule.min !== undefined && value.length < rule.min) {
      return `Must have at least ${rule.min} items`;
    }
    if (rule.max !== undefined && value.length > rule.max) {
      return `Must have at most ${rule.max} items`;
    }
  }
  
  // Pattern validation
  if (rule.pattern && typeof value === 'string') {
    if (!rule.pattern.test(value)) {
      return 'Invalid format';
    }
  }
  
  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (typeof result === 'string') {
      return result;
    }
    if (result === false) {
      return 'Validation failed';
    }
  }
  
  return null;
}

/**
 * Validates data against multiple rules
 */
export function validateFields(
  data: Record<string, any>,
  rules: ValidationRule[]
): ValidationResult {
  const errors: Array<{ field: string; message: string; value?: any }> = [];
  
  for (const rule of rules) {
    const value = data[rule.field];
    const error = validateField(rule.field, value, rule);
    
    if (error) {
      errors.push({
        field: rule.field,
        message: error,
        value
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates date range (start date must be before end date)
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  startFieldName: string = 'startDate',
  endFieldName: string = 'endDate'
): ErrorResponse | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    return formatValidationError(startFieldName, 'Invalid start date');
  }
  
  if (isNaN(end.getTime())) {
    return formatValidationError(endFieldName, 'Invalid end date');
  }
  
  if (start >= end) {
    return formatValidationError(
      endFieldName,
      'End date must be after start date'
    );
  }
  
  return null;
}

/**
 * Validates numeric range
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'value'
): ErrorResponse | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return formatValidationError(fieldName, 'Must be a valid number');
  }
  
  if (value < min || value > max) {
    return formatValidationError(
      fieldName,
      `Must be between ${min} and ${max}`
    );
  }
  
  return null;
}

/**
 * Validates email format
 */
export function validateEmail(
  email: string,
  fieldName: string = 'email'
): ErrorResponse | null {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(email)) {
    return formatValidationError(fieldName, 'Invalid email format');
  }
  
  return null;
}

/**
 * Validates phone number format (basic validation)
 */
export function validatePhone(
  phone: string,
  fieldName: string = 'phone'
): ErrorResponse | null {
  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it's a valid number with 10-15 digits
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    return formatValidationError(
      fieldName,
      'Invalid phone number format (10-15 digits required)'
    );
  }
  
  return null;
}

/**
 * Validates GSTIN format (Indian tax number)
 */
export function validateGSTIN(
  gstin: string,
  fieldName: string = 'gstin'
): ErrorResponse | null {
  // GSTIN format: 2 digits (state) + 10 alphanumeric (PAN) + 1 digit (entity) + 1 letter (Z) + 1 alphanumeric (checksum)
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinPattern.test(gstin)) {
    return formatValidationError(
      fieldName,
      'Invalid GSTIN format (e.g., 29ABCDE1234F1Z5)'
    );
  }
  
  return null;
}

/**
 * Validates PAN format (Indian permanent account number)
 */
export function validatePAN(
  pan: string,
  fieldName: string = 'pan'
): ErrorResponse | null {
  // PAN format: 5 letters + 4 digits + 1 letter
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  if (!panPattern.test(pan)) {
    return formatValidationError(
      fieldName,
      'Invalid PAN format (e.g., ABCDE1234F)'
    );
  }
  
  return null;
}

/**
 * Validates array is not empty
 */
export function validateNonEmptyArray(
  array: any[],
  fieldName: string = 'items'
): ErrorResponse | null {
  if (!Array.isArray(array) || array.length === 0) {
    return formatValidationError(fieldName, 'At least one item is required');
  }
  
  return null;
}

/**
 * Validates positive number
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string = 'value'
): ErrorResponse | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return formatValidationError(fieldName, 'Must be a valid number');
  }
  
  if (value <= 0) {
    return formatValidationError(fieldName, 'Must be a positive number');
  }
  
  return null;
}

/**
 * Helper to combine multiple validation results
 */
export function combineValidationErrors(
  ...errors: Array<ErrorResponse | null>
): ErrorResponse | null {
  const validErrors = errors.filter((e): e is ErrorResponse => e !== null);
  
  if (validErrors.length === 0) {
    return null;
  }
  
  if (validErrors.length === 1) {
    return validErrors[0] ?? null;
  }
  
  // Combine all error details
  const allErrors = validErrors.flatMap(e => 
    e.details?.errors || [{ field: 'unknown', message: e.error }]
  );
  
  return formatValidationErrors(allErrors);
}
