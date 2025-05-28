/**
 * Enhanced API Error Handling Middleware
 * 
 * Provides centralized error handling with standardized responses
 */
import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '../utils/response';
import { AppError, ErrorCodes } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Enhanced middleware for error handling and request tracking
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Create request logger with context
    const requestLogger = logger.createChildLogger({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
    });

    try {
      requestLogger.info('API request started');

      // Execute the handler
      const response = await handler(req, context);
      
      // Log successful completion
      const duration = Date.now() - startTime;
      requestLogger.info('API request completed', { 
        duration,
        status: response.status 
      });

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Log the error with full context
      requestLogger.error('API request failed', error, {
        duration,
        url: req.url,
        method: req.method,
      });

      // Return standardized error response
      return createErrorResponse(error);
    }
  };
}

/**
 * Middleware for validating required environment variables
 */
export function withEnvironmentValidation(requiredVars: string[]) {
  return function(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, context?: any) => {
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        const error = new AppError(
          `Missing required environment variables: ${missingVars.join(', ')}`,
          ErrorCodes.SERVER_ERROR,
          500,
          { missingVars },
          'Service configuration error. Please contact support.'
        );
        
        return createErrorResponse(error);
      }

      return handler(req, context);
    };
  };
}

/**
 * Middleware for request method validation
 */
export function withMethodValidation(allowedMethods: string[]) {
  return function(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, context?: any) => {
      if (!allowedMethods.includes(req.method || '')) {
        const error = new AppError(
          `Method ${req.method} not allowed`,
          ErrorCodes.CLIENT_ERROR,
          405,
          { allowedMethods },
          `Method ${req.method} is not allowed for this endpoint.`
        );
        
        return createErrorResponse(error);
      }

      return handler(req, context);
    };
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Array<(handler: ApiHandler) => ApiHandler>) {
  return function(handler: ApiHandler): ApiHandler {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
} 