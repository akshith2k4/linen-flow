import { z } from "zod";

/**
 * Shared validation utilities for workflow handlers
 */

// Safe number coercion (for non-date fields)
export const safeNumberCoercion = z.union([
  z.number(),
  z.string().transform((val, ctx) => {
    const num = Number(val);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot convert "${val}" to number`,
      });
      return z.NEVER;
    }
    return num;
  })
]).optional();

// Safe date coercion (allows YYYY-MM-DD strings)
export const safeDateCoercion = z.union([
  z.string(), // Accept date strings directly
  z.date().transform(d => d.toISOString().split('T')[0]) // Convert Date objects to YYYY-MM-DD
]).optional();

/**
 * Generic validation function that can be used by any handler
 */
export function validateAndCastPayload(
  payload: any,
  schema: z.ZodObject<any>
): { success: true; data: any } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(payload);
    
    if (!result.success) {
      const errors = result.error.issues.map((err: any) => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return { 
      success: false, 
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}
