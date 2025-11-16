/**
 * @fileoverview Shared API request and response type definitions.
 * @module lib/shared/src/types/api.ts
 * @dependencies none
 */
/**
 * API Types
 * 
 * Centralized type definitions for API requests, responses, and common structures.
 */

/**
 * Standardized API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: string;
    validationErrors?: Record<string, string>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Stock file structure
 */
export interface StockFile {
  name: string;
  data: StockDataPoint[];
  metadata?: {
    symbol: string;
    timeframe: string;
    lastUpdated: string;
  };
}

/**
 * Stock data point
 */
export interface StockDataPoint {
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  "10sma"?: number;
  "20sma"?: number;
  "50sma"?: number;
  Date?: string;
}

/**
 * Local folder file
 */
export interface LocalFolderFile {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
}

/**
 * Local folder structure
 */
export interface LocalFolder {
  id: string;
  name: string;
  files: LocalFolderFile[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceStatus;
    localData: ServiceStatus;
    auth: ServiceStatus;
  };
  environment: string;
}

/**
 * Service status
 */
export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

/**
 * Validation rule
 */
export interface ValidationRule<T = any> {
  validate: (value: T) => boolean | string;
  message?: string;
}

/**
 * Validation schema
 */
export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  errors?: Record<string, string>;
  data?: T;
}

