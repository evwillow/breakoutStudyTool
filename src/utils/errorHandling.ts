// Error codes for consistent error identification
export const ErrorCodes = {
  // API Error Codes (1000-1999)
  API_ERROR: 1000,
  API_NETWORK_ERROR: 1001,
  API_TIMEOUT: 1002,
  API_RATE_LIMITED: 1003,
  
  // Authentication Error Codes (2000-2999)
  AUTH_INVALID_CREDENTIALS: 2000,
  AUTH_EXPIRED_SESSION: 2001,
  AUTH_UNAUTHORIZED: 2002,
  AUTH_MISSING_PERMISSION: 2003,
  
  // Database Error Codes (3000-3999)
  DB_CONNECTION_ERROR: 3000,
  DB_QUERY_ERROR: 3001,
  DB_CONSTRAINT_VIOLATION: 3002,
  DB_RECORD_NOT_FOUND: 3003,
  
  // Validation Error Codes (4000-4999)
  VALIDATION_ERROR: 4000,
  VALIDATION_REQUIRED_FIELD: 4001,
  VALIDATION_INVALID_FORMAT: 4002,
  
  // Server Error Codes (5000-5999)
  SERVER_ERROR: 5000,
  SERVER_UNAVAILABLE: 5001,
  
  // External Service Error Codes (6000-6999)
  EXTERNAL_SERVICE_ERROR: 6000,
  GOOGLE_DRIVE_ERROR: 6001,
  
  // Client Error Codes (7000-7999)
  CLIENT_ERROR: 7000,
  CLIENT_OFFLINE: 7001,
  CLIENT_UNSUPPORTED_BROWSER: 7002,
  
  // Unexpected Error (9000-9999)
  UNEXPECTED_ERROR: 9000,
};

// Base custom error class
export class AppError extends Error {
  code: number;
  httpStatus: number;
  context: Record<string, any>;
  userMessage: string;
  timestamp: Date;
  
  constructor(
    message: string,
    code: number = ErrorCodes.UNEXPECTED_ERROR,
    httpStatus: number = 500,
    context: Record<string, any> = {},
    userMessage: string = "An unexpected error occurred. Please try again."
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.context = context;
    this.userMessage = userMessage;
    this.timestamp = new Date();
    
    // Ensures proper stack trace in modern JS engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// Specialized error classes
export class ApiError extends AppError {
  constructor(
    message: string,
    code: number = ErrorCodes.API_ERROR,
    httpStatus: number = 500,
    context: Record<string, any> = {},
    userMessage: string = "There was an issue communicating with our servers. Please try again."
  ) {
    super(message, code, httpStatus, context, userMessage);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string,
    code: number = ErrorCodes.AUTH_UNAUTHORIZED,
    httpStatus: number = 401,
    context: Record<string, any> = {},
    userMessage: string = "Authentication failed. Please sign in and try again."
  ) {
    super(message, code, httpStatus, context, userMessage);
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: number = ErrorCodes.DB_QUERY_ERROR,
    httpStatus: number = 500,
    context: Record<string, any> = {},
    userMessage: string = "Database operation failed. Please try again later."
  ) {
    super(message, code, httpStatus, context, userMessage);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    code: number = ErrorCodes.VALIDATION_ERROR,
    httpStatus: number = 400,
    context: Record<string, any> = {},
    userMessage: string = "Validation failed. Please check your input and try again."
  ) {
    super(message, code, httpStatus, context, userMessage);
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    code: number = ErrorCodes.EXTERNAL_SERVICE_ERROR,
    httpStatus: number = 502,
    context: Record<string, any> = {},
    userMessage: string = "We're having trouble with an external service. Please try again later."
  ) {
    super(message, code, httpStatus, context, userMessage);
  }
}

// Helper functions

// Standard API error response formatter
export function formatApiErrorResponse(error: any) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }
    };
  }
  
  // Handle unknown errors
  const appError = new AppError(
    error.message || "Unknown error occurred",
    ErrorCodes.UNEXPECTED_ERROR,
    500,
    { originalError: error.toString() }
  );
  
  return {
    success: false,
    error: {
      code: appError.code,
      message: appError.userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }
  };
}

// Function to log errors with context
export function logError(error: Error | AppError, additionalContext: Record<string, any> = {}) {
  const errorObject = error instanceof AppError 
    ? { ...error.toJSON(), ...additionalContext }
    : {
        message: error.message,
        stack: error.stack,
        ...additionalContext,
        timestamp: new Date().toISOString(),
      };
      
  // In production, we'd use a proper logging service
  // For now, just console.error with structured data
  console.error(JSON.stringify(errorObject, null, 2));
  
  // TODO: In a real implementation, we would send this to a logging service
  // such as Sentry, LogRocket, etc.
  // if (process.env.NODE_ENV === 'production') {
  //   sendToLoggingService(errorObject);
  // }
}

// Error recovery utilities

// Retry function for transient errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoffFactor?: number;
    retryableErrors?: Array<number | string>;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffFactor = 2,
    retryableErrors = [
      ErrorCodes.API_NETWORK_ERROR,
      ErrorCodes.API_TIMEOUT,
      ErrorCodes.API_RATE_LIMITED,
      ErrorCodes.DB_CONNECTION_ERROR,
      ErrorCodes.SERVER_UNAVAILABLE,
    ],
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if this error is retryable
      const errorCode = error instanceof AppError ? error.code : error.code || error.status;
      const isRetryable = retryableErrors.includes(errorCode);
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delayMs * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Log retry attempt
      logError(
        new AppError(`Retry attempt ${attempt + 1}/${maxRetries}`, ErrorCodes.UNEXPECTED_ERROR),
        { originalError: lastError, waitTime }
      );
    }
  }
  
  // This should never happen because the last failure in the loop should throw
  throw lastError;
}

// Circuit breaker pattern implementation
export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  options: {
    maxFailures?: number;
    resetTimeoutMs?: number;
    fallbackFn?: (...args: any[]) => Promise<T> | T;
  } = {}
) {
  const {
    maxFailures = 5,
    resetTimeoutMs = 30000,
    fallbackFn,
  } = options;
  
  let failures = 0;
  let circuitOpen = false;
  let lastFailureTime = 0;
  
  return async (...args: any[]): Promise<T> => {
    // Check if circuit is open
    if (circuitOpen) {
      const now = Date.now();
      if (now - lastFailureTime > resetTimeoutMs) {
        // Try to reset the circuit
        circuitOpen = false;
        failures = 0;
      } else if (fallbackFn) {
        // Use fallback if available
        return fallbackFn(...args);
      } else {
        throw new AppError(
          "Service temporarily unavailable (circuit open)",
          ErrorCodes.SERVER_UNAVAILABLE,
          503,
          { circuitBreakerStatus: 'open' },
          "This feature is temporarily unavailable. Please try again later."
        );
      }
    }
    
    try {
      const result = await fn(...args);
      // Reset failures on success
      failures = 0;
      return result;
    } catch (error: any) {
      failures++;
      lastFailureTime = Date.now();
      
      // Open the circuit if too many failures
      if (failures >= maxFailures) {
        circuitOpen = true;
        logError(
          new AppError(
            "Circuit breaker opened",
            ErrorCodes.SERVER_UNAVAILABLE,
            503,
            { failures, maxFailures }
          ),
          { originalError: error }
        );
      }
      
      // If fallback is available, use it
      if (circuitOpen && fallbackFn) {
        return fallbackFn(...args);
      }
      
      throw error;
    }
  };
}

// Helper for network status checking
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Check for network connection before making requests
export function checkNetworkConnection() {
  if (!isOnline()) {
    throw new AppError(
      "No internet connection",
      ErrorCodes.CLIENT_OFFLINE,
      0, // No HTTP status for client offline
      {},
      "You appear to be offline. Please check your internet connection and try again."
    );
  }
} 