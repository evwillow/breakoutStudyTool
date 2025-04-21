import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorCodes, formatApiErrorResponse } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: string;
    validationErrors?: Record<string, string>;
  };
};

type ApiHandler = (req: NextRequest, context: any) => Promise<NextResponse>;

/**
 * Middleware to standardize API responses and centralize error handling
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context: any) => {
    try {
      // Add request tracking for logging
      const requestId = crypto.randomUUID();
      const requestLogger = logger.createChildLogger({
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
      });
      
      // Log request (excluding sensitive data)
      requestLogger.info('API request received');
      
      // Execute the handler
      const response = await handler(req, context);
      
      // If response is already a NextResponse, return it directly
      return response;
    } catch (error: any) {
      // Log the error with context
      logger.error('API request failed', error, {
        url: req.url,
        method: req.method,
      });
      
      // Format standardized error response
      const formattedError = formatApiErrorResponse(error);
      
      // Determine appropriate HTTP status code
      const statusCode = error instanceof AppError
        ? error.httpStatus
        : 500;
        
      // Return JSON response with appropriate status
      return NextResponse.json(formattedError, { status: statusCode });
    }
  };
}

/**
 * Helper to create a standardized successful API response
 */
export function createSuccessResponse<T>(data?: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

/**
 * Helper to create a standardized error API response
 */
export function createErrorResponse(
  error: AppError | Error,
  validationErrors?: Record<string, string>
): ApiResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        validationErrors
      }
    };
  }
  
  // For regular errors, create a generic error response
  return {
    success: false,
    error: {
      code: ErrorCodes.UNEXPECTED_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      validationErrors
    }
  };
}

/**
 * Validate input data against a schema
 * Note: This is a simple validation function. In a real application, 
 * you might want to use a library like zod, joi, or yup.
 */
export function validateInput<T>(
  data: any,
  schema: Record<string, (value: any) => boolean>,
  errorMessages: Record<string, string>
): { isValid: boolean; errors: Record<string, string>; validatedData: Partial<T> } {
  const errors: Record<string, string> = {};
  const validatedData: Partial<T> = {};
  
  for (const [field, validator] of Object.entries(schema)) {
    try {
      if (!validator(data[field])) {
        errors[field] = errorMessages[field] || `Invalid value for ${field}`;
      } else {
        // Add the validated field to the result
        validatedData[field as keyof T] = data[field];
      }
    } catch (error) {
      errors[field] = errorMessages[field] || `Validation error for ${field}`;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validatedData
  };
} 