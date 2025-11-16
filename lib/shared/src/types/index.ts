/**
 * @fileoverview Barrel exports collecting all shared type definitions.
 * @module lib/shared/src/types/index.ts
 * @dependencies ./auth, ./game, ./flashcard, ./analytics, ./api, ./chart
 */
/**
 * Shared Types Index
 * 
 * Central export point for all shared type definitions.
 * Import from this file to access all types across the application.
 */

// Auth types
export * from './auth';

// Game types (exclude ChartCoordinate as it's in chart.ts)
export type { 
  GameSession, 
  Prediction, 
  StockData, 
  BreakoutPattern,
  Round,
  Match,
  CreateRoundRequest,
  LogMatchRequest,
  GameMetrics,
  GameState,
  TargetPoint
} from './game';

// Flashcard types
export * from './flashcard';

// Analytics types
export * from './analytics';

// API types (exclude ValidationResult as it's in auth.ts)
export type {
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  StockFile,
  StockDataPoint,
  LocalFolderFile,
  LocalFolder,
  HealthCheckResponse,
  ServiceStatus,
  ValidationRule,
  ValidationSchema
} from './api';

// Chart types (includes ChartCoordinate)
export * from './chart';

