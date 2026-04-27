/**
 * Error Formatting Utility
 * Provides consistent error response formatting across the application
 */

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Formats a generic error into a consistent error response
 */
export function formatError(
  error: Error | string,
  code?: string,
  details?: any
): ErrorResponse {
  const message = typeof error === 'string' ? error : error.message;
  
  return {
    success: false,
    error: message,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats a validation error for a specific field
 */
export function formatValidationError(
  field: string,
  message: string,
  value?: any
): ErrorResponse {
  return {
    success: false,
    error: `Validation failed for field '${field}': ${message}`,
    code: 'VALIDATION_ERROR',
    details: {
      field,
      message,
      ...(value !== undefined && { value })
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats multiple validation errors
 */
export function formatValidationErrors(
  errors: Array<{ field: string; message: string; value?: any }>
): ErrorResponse {
  return {
    success: false,
    error: `Validation failed for ${errors.length} field(s)`,
    code: 'VALIDATION_ERROR',
    details: {
      errors: errors.map(e => ({
        field: e.field,
        message: e.message,
        ...(e.value !== undefined && { value: e.value })
      }))
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats an API error response
 */
export function formatApiError(
  statusCode: number,
  message: string,
  endpoint?: string
): ErrorResponse {
  return {
    success: false,
    error: message,
    code: `API_ERROR_${statusCode}`,
    details: {
      statusCode,
      ...(endpoint && { endpoint })
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats a missing required field error
 */
export function formatMissingFieldError(field: string): ErrorResponse {
  return formatValidationError(field, 'This field is required');
}

/**
 * Formats a success response
 */
export function formatSuccess<T = any>(
  data?: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  };
}

/**
 * Checks if a response is an error response
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && response.success === false;
}

/**
 * Checks if a response is a success response
 */
export function isSuccessResponse(response: any): response is SuccessResponse {
  return response && response.success === true;
}

/**
 * Formats a workflow error (for agent workflows)
 */
export function formatWorkflowError(
  workflow: string,
  step: number,
  error: string
): ErrorResponse {
  return {
    success: false,
    error: `Workflow '${workflow}' failed at step ${step}: ${error}`,
    code: 'WORKFLOW_ERROR',
    details: {
      workflow,
      step,
      message: error
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats a not found error
 */
export function formatNotFoundError(
  resource: string,
  identifier: string | number
): ErrorResponse {
  return {
    success: false,
    error: `${resource} with identifier '${identifier}' not found`,
    code: 'NOT_FOUND',
    details: {
      resource,
      identifier
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats an unauthorized error
 */
export function formatUnauthorizedError(message?: string): ErrorResponse {
  return {
    success: false,
    error: message || 'Unauthorized access',
    code: 'UNAUTHORIZED',
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats a forbidden error
 */
export function formatForbiddenError(message?: string): ErrorResponse {
  return {
    success: false,
    error: message || 'Access forbidden',
    code: 'FORBIDDEN',
    timestamp: new Date().toISOString()
  };
}
