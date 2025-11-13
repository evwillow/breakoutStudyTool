/**
 * @fileoverview Global error boundary page that logs unhandled errors and displays recovery options.
 * @module src/web/app/error.tsx
 * @dependencies React, ../components/FallbackUI, @/lib/utils/logger, @/lib/config/errorConfig, @/lib/utils/errorHandling
 */
'use client';

import { useEffect, useCallback } from 'react';
import { GenericErrorFallback } from '../components/FallbackUI';
import { logger } from '@/lib/utils/logger';
import { errorConfig } from '@/lib/config/errorConfig';
import { AppError } from '@/lib/utils/errorHandling';

interface ErrorPageProps {
  error: Error | AppError;
  reset: () => void;
}

/**
 * Hook for safe navigation actions
 */
const useNavigation = () => {
  const goHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  const refreshPage = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  return { goHome, refreshPage };
};

/**
 * Determines appropriate error messaging based on error type and environment
 */
const getErrorDisplayProps = (error: Error | AppError) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      title: 'Application Error',
      message: error.userMessage,
    };
  }
  
  // Default title
  const title = 'Something went wrong';
  
  // Environment-specific messaging
  const message = isDevelopment 
    ? error.message || errorConfig.friendlyMessages.generic
    : errorConfig.friendlyMessages.generic;

  return { title, message };
};

/**
 * Global error page for handling uncaught errors in routes
 * Optimized for performance and maintainability
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const { goHome, refreshPage } = useNavigation();
  const { title, message } = getErrorDisplayProps(error);

  // Log error once on mount with comprehensive context
  useEffect(() => {
    const context = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    };

    logger.error('Unhandled route error', error, context);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <main className="max-w-2xl w-full" role="main" aria-labelledby="error-title">
        <GenericErrorFallback
          title={title}
          message={message}
          error={error}
          resetError={reset}
          showRetry={true}
        />
        
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact our support team at{' '}
            <a
              href={`mailto:${errorConfig.supportContact.email}`}
              className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label={`Email support at ${errorConfig.supportContact.email}`}
            >
              {errorConfig.supportContact.email}
            </a>
          </p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={goHome}
              className="px-4 py-2 text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              type="button"
              aria-label="Navigate to homepage"
            >
              Go Home
            </button>
            
            <button
              onClick={refreshPage}
              className="px-4 py-2 text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              type="button"
              aria-label="Refresh current page"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 