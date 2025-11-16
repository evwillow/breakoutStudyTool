/**
 * @fileoverview Shared game session, round, and prediction type definitions.
 * @module lib/shared/src/types/game.ts
 * @dependencies zod
 */
import { z } from 'zod';

/**
 * Game Types
 * 
 * Centralized type definitions for game sessions, rounds, matches, and predictions.
 * Includes Zod schemas for runtime validation and TypeScript types.
 */

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const GameSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  score: z.number().default(0),
  totalRounds: z.number().default(0),
  correctPredictions: z.number().default(0),
  startTime: z.date(),
  endTime: z.date().optional(),
  createdAt: z.date(),
});

export const PredictionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  stockSymbol: z.string(),
  prediction: z.enum(['up', 'down', 'neutral']),
  actualResult: z.enum(['up', 'down', 'neutral']).optional(),
  isCorrect: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
});

export const StockDataSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  data: z.record(z.any()),
  lastUpdated: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BreakoutPatternSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  date: z.date(),
  patternType: z.string(),
  quality: z.number().min(1).max(4),
  data: z.record(z.any()),
  createdAt: z.date(),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Game session type inferred from Zod schema
 */
export type GameSession = z.infer<typeof GameSessionSchema>;

/**
 * Prediction type inferred from Zod schema
 */
export type Prediction = z.infer<typeof PredictionSchema>;

/**
 * Stock data type inferred from Zod schema
 */
export type StockData = z.infer<typeof StockDataSchema>;

/**
 * Breakout pattern type inferred from Zod schema
 */
export type BreakoutPattern = z.infer<typeof BreakoutPatternSchema>;

/**
 * Round (game round)
 */
export interface Round {
  id: string;
  user_id: string;
  dataset_name: string;
  name?: string | null;
  completed: boolean;
  created_at: string;
  accuracy?: string;
  correctMatches?: number;
  totalMatches?: number;
}

/**
 * Match (user selection in a round)
 */
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
  // Price-focused accuracy fields (primary metric for stock trading)
  price_accuracy?: number; // 0-100, price accuracy percentage
  time_position?: number; // Time index where user selected
  price_error?: number; // Price error percentage (0-100)
  time_error?: number; // Time error percentage (0-100)
}

/**
 * Create round request
 */
export interface CreateRoundRequest {
  dataset_name: string;
  user_id: string;
  name?: string;
  completed?: boolean;
}

/**
 * Log match request
 */
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

/**
 * Game metrics
 */
export interface GameMetrics {
  currentMatchIndex: number;
  matchCount: number;
  correctCount: number;
  accuracy: number;
}

/**
 * Game state
 */
export interface GameState {
  currentIndex: number;
  feedback: 'correct' | 'incorrect' | null;
  disableButtons: boolean;
  showTimeUpOverlay: boolean;
  afterChartData: any;
  metrics: GameMetrics;
}

// Note: ChartCoordinate is defined in chart.ts to avoid duplication

/**
 * Target point
 */
export interface TargetPoint {
  x: number;
  y: number;
  price: number;
  timeIndex: number;
}
