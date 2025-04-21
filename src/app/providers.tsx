"use client";

import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ErrorFallback, NetworkErrorFallback } from "@/components/FallbackUI";
import { useEffect, useState } from "react";
import { logger } from "@/utils/logger";
import { AppError, ErrorCodes } from "@/utils/errorHandling";

/**
 * Global error handler for unhandled errors and Promise rejections
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

  // Set up global error handlers
  useEffect(() => {
    // Handle uncaught errors
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      handleGlobalError(event.error || new Error(event.message));
    };

    // Handle unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      handleGlobalError(event.reason);
    };

    // Set up network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Add all event listeners
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize with current network status
    setIsOnline(navigator.onLine);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Log initialization for debugging
  logger.debug("Providers initialized", { isOnline });

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