/**
 * @fileoverview Middleware helpers for consistent API error responses and logging.
 * @module src/web/app/api/_shared/middleware/errorHandler.ts
 * @dependencies next/server, @/lib/utils/logger, @/lib/utils/errorHandling
 */
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandling';
import { logger } from '@/lib/utils/logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<Response>;

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
      const rawResponse = await handler(req, context);
      
      // Convert Response to NextResponse if needed
      let response: NextResponse;
      if (rawResponse instanceof NextResponse) {
        response = rawResponse;
      } else {
        // Convert standard Response to NextResponse
        const body = await rawResponse.text();
        response = new NextResponse(body, {
          status: rawResponse.status,
          statusText: rawResponse.statusText,
          headers: rawResponse.headers,
        });
      }
      
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
      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        ErrorCodes.UNEXPECTED_ERROR,
        error instanceof AppError ? error.httpStatus : 500
      );
      const response = NextResponse.json(
        { success: false, error: appError.userMessage },
        { status: appError.httpStatus }
      );
      response.headers.set('X-Request-ID', requestId);
      return response;
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
        return NextResponse.json(
          { success: false, error: error.userMessage },
          { status: error.httpStatus }
        );
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
        
        return NextResponse.json(
          { success: false, error: error.userMessage },
          { status: error.httpStatus }
        );
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