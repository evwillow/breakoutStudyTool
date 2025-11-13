"use client";

import { ReactNode, useCallback, useMemo, ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandling';
import { ErrorFallback } from '@/components/FallbackUI';

/**
 * @component ErrorBoundary
 * @overview Wrapper around `react-error-boundary` that logs with app context and renders a branded fallback.
 * @usage ```tsx
 * <ErrorBoundary boundaryId="study-layout">
 *   <StudyLayout />
 * </ErrorBoundary>
 * ```
 * @when Surround feature areas that must fail gracefully without tearing down the entire page.
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional identifier for this error boundary instance for logging. */
  boundaryId?: string;
  /** Enable automatic error recovery attempts. @default false */
  enableAutoRecovery?: boolean;
}

/**
 * Optimized Error Boundary component using react-error-boundary
 * 
 * Features:
 * - Memory optimized with hooks instead of class component
 * - Consistent error handling with the rest of the app
 * - Optional auto-recovery mechanism
 * - Better TypeScript support
 * - Reduced bundle size
 */
export default function ErrorBoundary({
  children,
  fallback,
  onError,
  boundaryId = 'default',
  enableAutoRecovery = false,
}: ErrorBoundaryProps) {
  
  // Memoized error handler to prevent recreation on each render
  const handleError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    // Log error with boundary context
    const errorContext = {
      boundaryId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      enableAutoRecovery,
    };

    // Convert to AppError if it's not already one
    const processedError = error instanceof AppError 
      ? error 
      : new AppError(
          error.message || 'UI component error',
          ErrorCodes.CLIENT_ERROR,
          500,
          { originalError: error.stack },
          'Something went wrong with the user interface. Please try again.'
        );

    logger.error('ErrorBoundary caught error', processedError, errorContext);
    
    // Call the custom onError callback if provided
    onError?.(error, errorInfo);
  }, [onError, boundaryId, enableAutoRecovery]);

  // Memoized fallback renderer to prevent unnecessary re-renders
  const fallbackRenderer = useCallback(({ error, resetErrorBoundary }: FallbackProps) => {
    // If custom fallback is provided
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error, resetErrorBoundary);
      }
      return fallback;
    }

    // Use the centralized ErrorFallback component for consistency
    return (
      <ErrorFallback
        error={error}
        resetError={resetErrorBoundary}
      />
    );
  }, [fallback]);

  // Memoized error reset handler with optional auto-recovery
  const resetKeysFactory = useMemo(() => {
    if (!enableAutoRecovery) return undefined;
    
    // Return a function that generates reset keys based on current state
    // This can be extended to include specific conditions for auto-recovery
    return [Date.now()];
  }, [enableAutoRecovery]);

  return (
    <ReactErrorBoundary
      FallbackComponent={fallbackRenderer as React.ComponentType<FallbackProps>}
      onError={handleError}
      resetKeys={resetKeysFactory}
    >
      {children}
    </ReactErrorBoundary>
  );
} 