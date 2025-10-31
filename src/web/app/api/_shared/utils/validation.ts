/**
 * Simple Input Validation Utilities
 * 
 * Provides type-safe validation without external dependencies
 */
import { ValidationError, ErrorCodes } from '@/lib/utils/errorHandling';

export interface ValidationRule<T = any> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data: Partial<T>;
  errors: Record<string, string>;
}

/**
 * Validate input data against a schema
 */
export function validateInput<T = any>(
  data: any,
  schema: ValidationSchema
): ValidationResult<T> {
  const errors: Record<string, string> = {};
  const validatedData: Partial<T> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(value, rule.type, field);
      if (typeError) {
        errors[field] = typeError;
        continue;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`;
        continue;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} must be no more than ${rule.maxLength} characters`;
        continue;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
        continue;
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors[field] = `${field} must be at least ${rule.min}`;
        continue;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors[field] = `${field} must be no more than ${rule.max}`;
        continue;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors[field] = typeof customResult === 'string' ? customResult : `${field} is invalid`;
        continue;
      }
    }

    // If we get here, the field is valid
    validatedData[field as keyof T] = value;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    data: validatedData,
    errors
  };
}

/**
 * Validate a single value's type
 */
function validateType(value: any, type: ValidationRule['type'], fieldName: string): string | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${fieldName} must be a string`;
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `${fieldName} must be a number`;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${fieldName} must be a boolean`;
      }
      break;
    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return `${fieldName} must be a valid email address`;
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !isValidUUID(value)) {
        return `${fieldName} must be a valid UUID`;
      }
      break;
  }
  return null;
}

/**
 * Email validation regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * UUID validation regex
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Throw validation error if validation fails
 */
export function validateOrThrow<T = any>(
  data: any,
  schema: ValidationSchema
): T {
  const result = validateInput<T>(data, schema);
  
  if (!result.isValid) {
    throw new ValidationError(
      'Validation failed',
      ErrorCodes.VALIDATION_ERROR,
      400,
      { validationErrors: result.errors },
      'Please check your input and try again.'
    );
  }
  
  return result.data as T;
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  createRound: {
    dataset_name: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
    user_id: { required: true, type: 'uuid' as const },
    completed: { type: 'boolean' as const }
  },
  
  logMatch: {
    round_id: { required: true, type: 'uuid' as const },
    stock_symbol: { required: true, type: 'string' as const, minLength: 1, maxLength: 10 },
    user_selection: { required: true, type: 'number' as const, min: 0, max: 10 },
    correct: { required: true, type: 'boolean' as const }
  },
  
  signup: {
    email: { required: true, type: 'email' as const, maxLength: 255 },
    password: { 
      required: true, 
      type: 'string' as const, 
      minLength: 8,
      custom: (password: string) => {
        if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
        if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
        return true;
      }
    },
    captchaToken: { type: 'string' as const }
  },
  
  pagination: {
    page: { type: 'number' as const, min: 1 },
    limit: { type: 'number' as const, min: 1, max: 100 },
    sortBy: { type: 'string' as const, maxLength: 50 },
    sortOrder: { 
      type: 'string' as const,
      custom: (value: string) => ['asc', 'desc'].includes(value) || 'Sort order must be "asc" or "desc"'
    }
  }
}; 