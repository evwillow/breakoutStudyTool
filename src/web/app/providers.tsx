"use client";

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "../components";
import { ErrorFallback, NetworkErrorFallback } from "../components/FallbackUI";
import { useEffect, useState, useCallback } from "react";
import { logger } from "@/lib/utils/logger";
import { AppError, ErrorCodes } from "@/lib/utils/errorHandling";

/**
 * Memory-optimized global error handler for unhandled errors and Promise rejections
 * @param error The error that was thrown
 */
const handleGlobalError = (error: any) => {
  logger.error("Unhandled global error", error instanceof Error ? error : new Error(String(error)));
};

/**
 * Providers component that wraps the application with all necessary providers
 * including error boundaries and authentication context
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  
  // Memoize event handlers to prevent recreation on each render
  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);
  
  const errorHandler = useCallback((event: ErrorEvent) => {
    event.preventDefault();
    handleGlobalError(event.error || new Error(event.message));
  }, []);
  
  const rejectionHandler = useCallback((event: PromiseRejectionEvent) => {
    event.preventDefault();
    handleGlobalError(event.reason);
  }, []);

  // Set up global error handlers with optimized listeners
  useEffect(() => {
    // Initialize with current network status
    setIsOnline(navigator.onLine);
    
    // Log initialization for debugging (only once)
    logger.debug("Providers initialized", { isOnline: navigator.onLine });
    
    // Add all event listeners
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [errorHandler, rejectionHandler, handleOnline, handleOffline]);

  // Show network error UI if offline
  if (!isOnline) {
    return <NetworkErrorFallback onRetry={() => window.location.reload()} />;
  }

  return (
    <ErrorBoundary
      fallback={(error, resetErrorBoundary) => (
        <ErrorFallback error={error} resetError={resetErrorBoundary} />
      )}
      onError={(error, errorInfo) => {
        logger.error("React error boundary caught error", error, {
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </ErrorBoundary>
  );
} 