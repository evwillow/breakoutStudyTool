/**
 * @fileoverview Barrel exports for the ErrorBoundary component and related types.
 * @module src/web/components/ErrorBoundary/index.ts
 * @dependencies ./ErrorBoundary, react-error-boundary
 */
/**
 * ErrorBoundary module exports
 * 
 * Provides a centralized error boundary implementation with:
 * - Optimized performance using react-error-boundary
 * - Consistent error handling across the application
 * - Optional auto-recovery capabilities
 * - Comprehensive logging and error tracking
 */

export { default as ErrorBoundary } from './ErrorBoundary';
export { default } from './ErrorBoundary';

// Export types for consumers
export type { ErrorBoundaryProps } from './ErrorBoundary';

// Re-export useful types from react-error-boundary for convenience
export type { FallbackProps } from 'react-error-boundary'; 