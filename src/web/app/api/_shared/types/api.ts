/**
 * Standardized API Types
 * 
 * Defines consistent request/response types for all API endpoints
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Game-related types
export interface Round {
  id: string;
  user_id: string;
  dataset_name: string;
  completed: boolean;
  created_at: string;
  accuracy?: string;
  correctMatches?: number;
  totalMatches?: number;
}

export interface Match {
  id: string;
  round_id: string;
  stock_symbol: string;
  user_selection: number; // Keep for backward compatibility
  correct: boolean;
  created_at: string;
  // New coordinate-based fields
  user_selection_x?: number;
  user_selection_y?: number;
  target_x?: number;
  target_y?: number;
  distance?: number;
  score?: number;
}

export interface CreateRoundRequest {
  dataset_name: string;
  user_id: string;
  completed?: boolean;
}

export interface LogMatchRequest {
  round_id: string;
  stock_symbol: string;
  user_selection?: number; // Optional for backward compatibility
  correct?: boolean; // Optional - can be calculated from score
  // New coordinate-based fields
  user_selection_x?: number;
  user_selection_y?: number;
  target_x?: number;
  target_y?: number;
  distance?: number;
  score?: number;
  // Price-focused accuracy fields (primary metric for stock trading)
  price_accuracy?: number; // 0-100, price accuracy percentage
  time_position?: number; // Time index where user selected
  price_error?: number; // Price error percentage (0-100)
  time_error?: number; // Time error percentage (0-100)
}

// User-related types
export interface User {
  id: string;
  email: string;
  username?: string;
  email_verified: boolean;
  created_at: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

// File-related types
export interface StockFile {
  name: string;
  data: StockDataPoint[];
  metadata?: {
    symbol: string;
    timeframe: string;
    lastUpdated: string;
  };
}

export interface StockDataPoint {
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  "10sma"?: number;
  "20sma"?: number;
  "50sma"?: number;
}

export interface LocalFolder {
  id: string;
  name: string;
  files: Array<{
    id: string;
    name: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdTime: string;
    modifiedTime: string;
  }>;
}

// Diagnostic types
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

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
} 