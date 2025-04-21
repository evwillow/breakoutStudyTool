import { useState, useCallback, useEffect } from 'react';
import { AppError, ErrorCodes } from './errorHandling';
import { logger } from './logger';
import { isOnline } from './errorHandling';

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error | AppError) => void;
  autoReset?: number | null;
  retryCount?: number;
  retryDelay?: number;
  retryExponential?: boolean;
  immediate?: boolean;
  initialData?: T;
  skipNetworkCheck?: boolean;
}

export interface UseAsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | AppError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  run: (...args: any[]) => Promise<T>;
  reset: () => void;
  retry: () => Promise<T | null>;
}

/**
 * Custom hook to handle async operations with built-in error handling
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncState<T> {
  const {
    onSuccess,
    onError,
    autoReset = null,
    retryCount = 3,
    retryDelay = 1000,
    retryExponential = true,
    immediate = false,
    initialData = null,
    skipNetworkCheck = false,
  } = options;

  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | AppError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(initialData);
    setError(null);
    setRetryAttempt(0);
  }, [initialData]);

  const run = useCallback(
    async (...args: any[]): Promise<T> => {
      // Check network connectivity if required
      if (!skipNetworkCheck && !isOnline()) {
        const networkError = new AppError(
          'No internet connection',
          ErrorCodes.CLIENT_OFFLINE,
          0,
          {},
          'You appear to be offline. Please check your internet connection and try again.'
        );
        setStatus('error');
        setError(networkError);
        
        if (onError) {
          onError(networkError);
        }
        
        throw networkError;
      }
      
      setStatus('pending');
      setLastArgs(args);
      
      try {
        const result = await asyncFunction(...args);
        setStatus('success');
        setData(result);
        setError(null);
        setRetryAttempt(0);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err: any) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        
        // Convert to AppError if needed
        const appError = err instanceof AppError 
          ? err 
          : new AppError(
              errorInstance.message,
              ErrorCodes.UNEXPECTED_ERROR,
              500,
              { originalError: errorInstance }
            );
        
        setStatus('error');
        setError(appError);
        
        // Log error details
        logger.error('Async operation failed', appError, {
          functionName: asyncFunction.name,
          args: JSON.stringify(args.map(a => 
            typeof a === 'object' ? { ...a, toString: undefined } : a
          )),
          retryAttempt
        });
        
        if (onError) {
          onError(appError);
        }
        
        throw appError;
      }
    },
    [asyncFunction, onSuccess, onError, retryAttempt, skipNetworkCheck]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (status !== 'error' || retryAttempt >= retryCount) {
      return null;
    }
    
    const nextRetryAttempt = retryAttempt + 1;
    setRetryAttempt(nextRetryAttempt);
    
    // Calculate delay with exponential backoff if enabled
    const delay = retryExponential 
      ? retryDelay * Math.pow(2, retryAttempt)
      : retryDelay;
      
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Run the function again with the same arguments
    return run(...lastArgs);
  }, [status, retryAttempt, retryCount, retryDelay, retryExponential, run, lastArgs]);

  // Auto-reset after specified time
  useEffect(() => {
    if (autoReset && (status === 'success' || status === 'error')) {
      const timer = setTimeout(() => {
        reset();
      }, autoReset);
      
      return () => clearTimeout(timer);
    }
  }, [status, autoReset, reset]);

  // Run immediately if specified
  useEffect(() => {
    if (immediate) {
      run();
    }
  }, [immediate, run]);

  return {
    status,
    data,
    error,
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    isIdle: status === 'idle',
    run,
    reset,
    retry
  };
}

export default useAsync; 