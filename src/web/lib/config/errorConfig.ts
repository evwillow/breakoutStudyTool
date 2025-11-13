/**
 * @fileoverview Error configuration constants for consistent messaging and retry behavior.
 * @module src/web/lib/config/errorConfig.ts
 * @dependencies none
 */

/**
 * Error handling configuration file
 * 
 * Centralizes error handling settings based on environment.
 * Different behaviors can be set for development vs. production.
 */

/**
 * Determines whether the current environment is production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Global error handling configuration
 */
export const errorConfig = {
  // Whether to show detailed error messages to users
  showDetailedErrors: !isProduction,
  
  // Default timeout for API requests in milliseconds
  defaultRequestTimeout: isProduction ? 15000 : 30000,
  
  // Number of retry attempts for API requests
  defaultRetryCount: isProduction ? 3 : 1,
  
  // Whether to use error tracking service (like Sentry)
  useErrorTracking: isProduction,
  
  // Whether to log errors to the console
  logErrorsToConsole: true,
  
  // Support contact information for user errors
  supportContact: {
    email: 'evan_maus@berkeley.edu',
    phone: '+1-888-123-4567',
    hours: '9am - 5pm ET, Monday - Friday'
  },
  
  // Error message sanitization (for security)
  sanitizeErrorMessages: isProduction,
  
  // User-friendly messages for common errors
  friendlyMessages: {
    // Network-related errors
    network: 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.',
    
    // Authentication errors
    auth: 'Your session has expired or you are not authorized. Please sign in again.',
    
    // Server errors
    server: 'We\'re experiencing technical difficulties. Our team has been notified and is working on a fix.',
    
    // Data validation errors
    validation: 'There was an issue with the information you provided. Please check your input and try again.',
    
    // Database errors
    database: 'We\'re having trouble accessing your data. Please try again in a few moments.',
    
    // External service errors
    externalService: 'We\'re having trouble connecting to one of our services. Please try again later.',
    
    // Generic fallback error
    generic: 'Something went wrong. Please try again later.'
  },
  
  // Paths to redirect on specific errors
  redirectPaths: {
    authFailure: '/api/auth/signin',
    serverError: '/error',
    notFound: '/404',
    forbidden: '/403',
  },
  
  // Debug mode settings (additional logging)
  debug: {
    enabled: !isProduction,
    verboseLogging: !isProduction,
    traceApiCalls: !isProduction,
    mockErrors: false, // For testing error handling
  }
};

export default errorConfig; 