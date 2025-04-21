'use client';

import { useEffect } from 'react';
import { GenericErrorFallback } from '@/components/FallbackUI';
import { logger } from '@/utils/logger';
import { errorConfig } from '@/config/errorConfig';

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

/**
 * Global error page for handling uncaught errors in routes
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Log the error when it happens
  useEffect(() => {
    logger.error('Unhandled route error', error, {
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }, [error]);

  // Determine friendly error message based on error
  let errorTitle = 'Something went wrong';
  let errorMessage = errorConfig.friendlyMessages.generic;

  // In development, show more detail
  if (process.env.NODE_ENV !== 'production') {
    errorMessage = error.message || errorConfig.friendlyMessages.generic;
    
    // For stack trace, only in development
    const stackInfo = error.stack || '';
    if (stackInfo && typeof document !== 'undefined') {
      console.error('Error details:', error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <main className="max-w-2xl w-full">
        <GenericErrorFallback
          title={errorTitle}
          message={errorMessage}
          error={error}
          resetError={reset}
          showRetry={true}
        />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact our support team at{' '}
            <a
              href={`mailto:${errorConfig.supportContact.email}`}
              className="text-blue-600 hover:underline"
            >
              {errorConfig.supportContact.email}
            </a>
          </p>
          
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
            >
              Go Home
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 