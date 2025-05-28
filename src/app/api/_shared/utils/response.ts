/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formatting across all API endpoints
 */
import { NextResponse } from 'next/server';
import { ApiResponse, PaginationMeta } from '../types/api';
import { AppError, ErrorCodes } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data?: T,
  meta?: Partial<ApiResponse<T>['meta']>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return NextResponse.json(response);
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: AppError | Error | string,
  statusCode: number = 500,
  validationErrors?: Record<string, string>
): NextResponse {
  let appError: AppError;

  if (typeof error === 'string') {
    appError = new AppError(error, ErrorCodes.UNEXPECTED_ERROR, statusCode);
  } else if (error instanceof AppError) {
    appError = error;
  } else {
    appError = new AppError(
      error.message || 'Unknown error occurred',
      ErrorCodes.UNEXPECTED_ERROR,
      statusCode
    );
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code: appError.code,
      message: appError.userMessage,
      details: process.env.NODE_ENV === 'development' ? appError.message : undefined,
      validationErrors
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  // Log the error
  logger.error('API Error Response', appError);

  return NextResponse.json(response, { status: appError.httpStatus });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  meta?: Partial<ApiResponse<T[]>['meta']>
): NextResponse {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
      ...meta
    }
  };

  return NextResponse.json(response);
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number = 1,
  limit: number = 10
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: string | number,
  limit?: string | number
): { page: number; limit: number } {
  const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  const validatedPage = Math.max(1, parsedPage || 1);
  const validatedLimit = Math.min(100, Math.max(1, parsedLimit || 10));

  return {
    page: validatedPage,
    limit: validatedLimit
  };
}

/**
 * Add cache headers to response
 */
export function addCacheHeaders(
  response: NextResponse,
  maxAge: number = 300,
  staleWhileRevalidate: number = 60
): NextResponse {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  return response;
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 