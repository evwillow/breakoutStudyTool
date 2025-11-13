/**
 * @fileoverview Global Next.js provider setup for session, analytics, and shared contexts.
 * @module src/web/app/providers.tsx
 * @dependencies React, next-auth/react, @/components/GoogleAnalytics
 */
'use client';

import { SessionProvider } from 'next-auth/react';
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
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Handle ChunkLoadError - this happens when Next.js chunks fail to load
  // Usually due to deployment updates or cache issues
  if (errorObj.name === 'ChunkLoadError' || 
      errorObj.message?.includes('Loading chunk') ||
      errorObj.message?.includes('Failed to load resource')) {
    logger.warn('ChunkLoadError detected - will reload page', {
      error: errorObj.message,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    });
    
    // Reload the page after a short delay to get fresh chunks
    // Only reload once to prevent infinite loops
    if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk-reload-attempted')) {
      sessionStorage.setItem('chunk-reload-attempted', 'true');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }
  }
  
  logger.error("Unhandled global error", errorObj);
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
    
    // Check for ChunkLoadError in promise rejections
    const reason = event.reason;
    if (reason && typeof reason === 'object') {
      const errorName = (reason as any).name || (reason as any).constructor?.name;
      const errorMessage = (reason as any).message || String(reason);
      
      if (errorName === 'ChunkLoadError' || 
          errorMessage?.includes('Loading chunk') ||
          errorMessage?.includes('Failed to load resource')) {
        logger.warn('ChunkLoadError in promise rejection - will reload page', {
          error: errorMessage,
          url: window.location.href
        });
        
        // Reload the page after a short delay
        if (!sessionStorage.getItem('chunk-reload-attempted')) {
          sessionStorage.setItem('chunk-reload-attempted', 'true');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      }
    }
    
    handleGlobalError(reason);
  }, []);

  // Set up global error handlers with optimized listeners
  useEffect(() => {
    // Initialize with current network status
    setIsOnline(navigator.onLine);
    
    // Clear chunk reload flag on mount (allows retry on new page load)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chunk-reload-attempted');
    }
    
    // Log initialization for debugging (only once)
    logger.debug("Providers initialized", { isOnline: navigator.onLine });
    
    // Add all event listeners
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for chunk loading errors specifically
    const handleChunkError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href;
        if (src && (src.includes('/_next/static/') || src.includes('chunk'))) {
          const errorEvent = event as ErrorEvent;
          if (errorEvent && (errorEvent.message?.includes('chunk') || 
              errorEvent.message?.includes('Failed to load'))) {
            logger.warn('Chunk loading error detected from script/link tag', {
              src,
              message: errorEvent.message
            });
            
            if (!sessionStorage.getItem('chunk-reload-attempted')) {
              sessionStorage.setItem('chunk-reload-attempted', 'true');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }
        }
      }
    };
    
    window.addEventListener('error', handleChunkError, true);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('error', handleChunkError, true);
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
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
        refetchWhenOffline={false}
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
} 