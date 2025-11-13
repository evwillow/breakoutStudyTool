import type { ChartCoordinate, UseGameStateOptions } from '@breakout-study-tool/shared';
import { calculateDistance, calculateDistanceScore } from '@/components/Flashcards/utils/coordinateUtils';
import { SCORING_CONFIG } from '@/config/game.config';

export { ChartCoordinate, UseGameStateOptions };

export interface CoordinateSelectionParams {
  coordinates: ChartCoordinate;
  target?: ChartCoordinate;
  priceRange?: { min: number; max: number };
  timeRange?: { min: number; max: number };
}

export interface CoordinateSelectionResult {
  distance: number | null;
  score: number | null;
  scoreData?: ReturnType<typeof calculateDistanceScore>;
  isCorrect: boolean;
}

export function evaluateCoordinateSelection({
  coordinates,
  target,
  priceRange,
  timeRange,
}: CoordinateSelectionParams): CoordinateSelectionResult {
  if (!target || !priceRange || !timeRange) {
    return {
      distance: null,
      score: null,
      isCorrect: false,
    };
  }

  const calculatedDistance = calculateDistance(coordinates, target);
  const scoreData = calculateDistanceScore(coordinates, target, priceRange, timeRange);
  const isCorrect = scoreData.priceAccuracy >= SCORING_CONFIG.CORRECT_THRESHOLD;

  return {
    distance: calculatedDistance,
    score: scoreData.score,
    scoreData,
    isCorrect,
  };
}

export interface MatchMetrics {
  matchCount: number;
  correctCount: number;
}

export function updateMatchMetrics(
  metrics: MatchMetrics,
  isCorrect: boolean
): MatchMetrics {
  return {
    matchCount: metrics.matchCount + 1,
    correctCount: metrics.correctCount + (isCorrect ? 1 : 0),
  };
}

export function calculateAccuracy(matchCount: number, correctCount: number): number {
  if (matchCount <= 0) {
    return 0;
  }
  return Math.round((correctCount / matchCount) * 100);
}

export interface ExistingMatchesSummary {
  totalMatches: number;
  correctMatches: number;
  accuracy: number;
}

export function summarizeExistingMatches(
  matches: Array<{ correct: boolean }>
): ExistingMatchesSummary {
  const totalMatches = matches.length;
  const correctMatches = matches.filter(match => match.correct).length;
  const accuracy =
    totalMatches > 0 ? Math.round((correctMatches / totalMatches) * 100) : 0;

  return {
    totalMatches,
    correctMatches,
    accuracy,
  };
}

