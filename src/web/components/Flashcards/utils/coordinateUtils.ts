/**
 * @fileoverview Coordinate utilities for converting selections and computing scoring metrics.
 * @module src/web/components/Flashcards/utils/coordinateUtils.ts
 * @dependencies @breakout-study-tool/shared, @/config/game.config
 */
/**
 * Coordinate and Distance Utilities
 * 
 * Utilities for calculating target points from chart data,
 * converting between chart coordinates and price/time,
 * and calculating distance-based scores.
 */

import type { ChartCoordinate } from '@breakout-study-tool/shared';
import { SCORING_CONFIG } from '@/config/game.config';
import type { ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';

// Re-export for backward compatibility
export type { ChartCoordinate };

export interface TargetPoint {
  x: number;
  y: number;
  price: number;
  timeIndex: number;
}

/**
 * After data point type - similar to ProcessedStockDataPoint but for after.json data
 */
export type AfterDataPoint = ProcessedStockDataPoint;

/**
 * Calculate the target point from after data
 * Uses the peak close price in the after data as the target
 */
export function calculateTargetPoint(
  afterData: AfterDataPoint[],
  scales: {
    xScale: (value: number) => number;
    yScale: (value: number) => number;
    minPrice: number;
    maxPrice: number;
  },
  dataOffset: number = 0 // Offset for combining main + after data
): TargetPoint | null {
  if (!afterData || afterData.length === 0) {
    return null;
  }

  // Find the highest close price (peak breakout point)
  let maxClose = -Infinity;
  let maxIndex = -1;
  let maxPriceValue = 0;

  afterData.forEach((point, index) => {
    const close = point.close || point.Close || point.CLOSE;
    if (close && typeof close === 'number' && close > maxClose) {
      maxClose = close;
      maxIndex = index;
      maxPriceValue = close;
    }
  });

  if (maxIndex === -1) {
    return null;
  }

  // Calculate chart coordinates
  const timeIndex = dataOffset + maxIndex;
  const x = scales.xScale(timeIndex);
  const y = scales.yScale(maxPriceValue);

  return {
    x,
    y,
    price: maxPriceValue,
    timeIndex
  };
}

/**
 * Convert screen coordinates to chart coordinates
 */
export function screenToChartCoordinates(
  screenX: number,
  screenY: number,
  svgRect: DOMRect,
  scales: {
    xScale: (value: number) => number;
    yScale: (value: number) => number;
    xScaleInvert: (value: number) => number;
    yScaleInvert: (value: number) => number;
  }
): ChartCoordinate {
  // Account for SVG padding/offset
  const chartX = screenX - svgRect.left;
  const chartY = screenY - svgRect.top;

  // Invert scales to get data coordinates
  const dataX = scales.xScaleInvert(chartX);
  const dataY = scales.yScaleInvert(chartY);

  return {
    x: dataX,
    y: dataY
  };
}

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(
  point1: ChartCoordinate,
  point2: ChartCoordinate
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance-based score (0-100) primarily based on price accuracy
 * Price accuracy is the primary metric for stock trading
 * Time position is recorded but doesn't heavily impact the score
 */
export function calculateDistanceScore(
  userPoint: ChartCoordinate,
  targetPoint: ChartCoordinate,
  priceRange: { min: number; max: number },
  timeRange: { min: number; max: number }
): {
  score: number;
  priceAccuracy: number;
  timePosition: number;
  priceError: number;
  timeError: number;
} {
  // Calculate price difference (vertical accuracy - PRIMARY METRIC)
  const priceDiff = Math.abs(targetPoint.y - userPoint.y);
  const priceRangeSize = priceRange.max - priceRange.min;
  
  // Calculate time difference (for recording, but minimal impact on score)
  const timeDiff = Math.abs(targetPoint.x - userPoint.x);
  const timeRangeSize = timeRange.max - timeRange.min;
  
  // Normalize to percentage of range
  const priceError = priceRangeSize > 0 ? priceDiff / priceRangeSize : 0;
  const timeError = timeRangeSize > 0 ? timeDiff / timeRangeSize : 0;
  
  // Calculate price accuracy (0-100%) - PRIMARY METRIC
  // Score is based almost entirely on price accuracy (configurable weight)
  // Time accuracy has minimal impact - just for recording
  const priceAccuracy = Math.max(0, 100 * (1 - priceError));
  const timeAccuracy = Math.max(0, 100 * (1 - timeError));
  
  // Weighted score using configured weights
  // This ensures price prediction accuracy is the primary factor
  const weightedScore = priceAccuracy * SCORING_CONFIG.PRICE_WEIGHT + timeAccuracy * SCORING_CONFIG.TIME_WEIGHT;
  
  return {
    score: Math.round(weightedScore * 100) / 100,
    priceAccuracy: Math.round(priceAccuracy * 100) / 100,
    timePosition: userPoint.x, // Record the time index where user selected
    priceError: Math.round(priceError * 10000) / 100, // Percentage error (0-100)
    timeError: Math.round(timeError * 10000) / 100, // Percentage error (0-100)
  };
}

/**
 * Format distance for display (like GeoGuessr)
 */
export function formatDistance(distance: number): string {
  if (distance < 10) {
    return `${distance.toFixed(1)} units`;
  } else if (distance < 100) {
    return `${distance.toFixed(0)} units`;
  } else {
    return `${distance.toFixed(0)} units`;
  }
}

/**
 * Get accuracy tier based on distance score
 */
export function getAccuracyTier(score: number): {
  tier: string;
  color: string;
} {
  if (score >= 90) {
    return { tier: 'Excellent', color: 'text-green-500' };
  } else if (score >= 70) {
    return { tier: 'Great', color: 'text-green-400' };
  } else if (score >= 50) {
    return { tier: 'Good', color: 'text-yellow-400' };
  } else if (score >= 30) {
    return { tier: 'Fair', color: 'text-orange-400' };
  } else {
    return { tier: 'Needs Work', color: 'text-red-400' };
  }
}
