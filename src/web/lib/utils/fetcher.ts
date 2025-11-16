/**
 * @fileoverview Lightweight fetch wrapper providing JSON parsing and error propagation.
 * @module src/web/lib/utils/fetcher.ts
 * @dependencies fetch
 */
import type { ApiResponse } from '@breakout-study-tool/shared';
import { AppError, ErrorCodes, ApiError } from './errorHandling';
import { isOnline } from './errorHandling';
import { logger } from './logger';

/**
 * Options for the fetch request
 */
interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  skipNetworkCheck?: boolean;
}

/**
 * Enhanced fetch function with error handling, retries, and timeout
 */
interface FetcherOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  skipNetworkCheck?: boolean;
}

export async function fetcher<T>(input: RequestInfo, init?: FetcherOptions): Promise<T> {
  const {
    timeout = 10000,            // 10 second timeout by default
    retries = 3,                // Retry 3 times by default
    retryDelay = 1000,          // Start with 1 second delay
    retryBackoff = true,        // Use exponential backoff
    skipNetworkCheck = false,   // Check for network connectivity by default
    ...fetchOptions
  } = init || {};

  // Check network connectivity
  if (!skipNetworkCheck && !isOnline()) {
    throw new AppError(
      'No internet connection',
      ErrorCodes.CLIENT_OFFLINE,
      0,
      { url: input as string },
      'You appear to be offline. Please check your internet connection and try again.'
    );
  }

  let lastError: Error | null = null;

  // Try multiple times if retries > 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Add the signal to the fetch options
      const fetchOptionsWithSignal = {
        ...fetchOptions,
        signal: controller.signal,
      };

      // Start the fetch request
      const response = await fetch(input, fetchOptionsWithSignal);
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      // If not ok, handle specific status codes
      if (!response.ok) {
        let errorResponseData: any = {};
        
        try {
          // Try to parse the error response as JSON
          errorResponseData = await response.json();
        } catch (parseError) {
          // If it fails, use the status text
          errorResponseData = { message: response.statusText };
        }

        // Handle specific HTTP status codes
        switch (response.status) {
          case 401:
            throw new ApiError(
              `Authentication failed: ${errorResponseData.message || 'Unauthorized'}`,
              ErrorCodes.AUTH_UNAUTHORIZED,
              401,
              { url: input as string, status: response.status, response: errorResponseData },
              'Your session has expired. Please sign in again.'
            );
            
          case 403:
            throw new ApiError(
              `Access denied: ${errorResponseData.message || 'Forbidden'}`,
              ErrorCodes.AUTH_MISSING_PERMISSION,
              403,
              { url: input as string, status: response.status, response: errorResponseData },
              'You do not have permission to access this resource.'
            );
            
          case 404:
            throw new ApiError(
              `Resource not found: ${errorResponseData.message || 'Not Found'}`,
              ErrorCodes.API_ERROR,
              404,
              { url: input as string, status: response.status, response: errorResponseData },
              'The requested resource was not found.'
            );
            
          case 429:
            throw new ApiError(
              `Rate limited: ${errorResponseData.message || 'Too Many Requests'}`,
              ErrorCodes.API_RATE_LIMITED,
              429,
              { url: input as string, status: response.status, response: errorResponseData },
              'You have made too many requests. Please try again later.'
            );
            
          default:
            throw new ApiError(
              `API request failed: ${errorResponseData.message || response.statusText}`,
              ErrorCodes.API_ERROR,
              response.status,
              { url: input as string, status: response.status, response: errorResponseData },
              'There was a problem with the request. Please try again later.'
            );
        }
      }

      // Parse the response
      const data = await response.json();
      
      // If the response has standard API response format
      if ('success' in data) {
        const apiResponse = data as ApiResponse<T>;
        
        if (!apiResponse.success) {
          // Handle error response
          throw new ApiError(
            apiResponse.error?.details || 'API request failed',
            apiResponse.error?.code || ErrorCodes.API_ERROR,
            response.status,
            { url: input as string, response: apiResponse },
            apiResponse.error?.message || 'Something went wrong with the request'
          );
        }
        
        // Return the data from the success response
        return apiResponse.data as T;
      }
      
      // Return the raw data if not in standard format
      return data as T;
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's an abort error (timeout) or certain HTTP statuses
      const shouldNotRetry = 
        error.name === 'AbortError' ||
        (error instanceof ApiError && [401, 403, 404].includes(error.httpStatus));

      // If we should not retry or this was the last attempt, throw the error
      if (shouldNotRetry || attempt === retries) {
        // If it's an AbortError, convert to a timeout error
        if (error.name === 'AbortError') {
          throw new ApiError(
            'Request timed out',
            ErrorCodes.API_TIMEOUT,
            408,
            { url: input as string, timeout },
            'The request took too long to complete. Please try again.'
          );
        }
        
        // Otherwise, rethrow the original error
        throw error;
      }

      // Log the retry attempt
      logger.warn(`Retrying failed request (attempt ${attempt + 1}/${retries})`, {
        url: input as string,
        error: error.message,
        attempt: attempt + 1,
      });

      // Calculate the delay for this retry attempt
      const delay = retryBackoff
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;

      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never happen due to the loop logic, but TypeScript needs it
  throw lastError || new Error('Unknown error in fetch');
}

/**
 * Wrapper for GET requests with error handling
 */
export async function getJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  return fetcher<T>(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Wrapper for POST requests with error handling
 */
export async function postJSON<T>(
  url: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> {
  return fetcher<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Wrapper for PUT requests with error handling
 */
export async function putJSON<T>(
  url: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> {
  return fetcher<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Wrapper for DELETE requests with error handling
 */
export async function deleteJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  return fetcher<T>(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });
} 