/**
 * Coordinate and Distance Utilities
 * 
 * Utilities for calculating target points from chart data,
 * converting between chart coordinates and price/time,
 * and calculating distance-based scores.
 */

export interface ChartCoordinate {
  x: number; // Horizontal position (time/index)
  y: number; // Vertical position (price)
}

export interface TargetPoint {
  x: number;
  y: number;
  price: number;
  timeIndex: number;
}

/**
 * Calculate the target point from after data
 * Uses the peak close price in the after data as the target
 */
export function calculateTargetPoint(
  afterData: any[],
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
 * Calculate distance-based score (0-100) using normalized distance
 * Uses percentage error approach for more logical scoring
 */
export function calculateDistanceScore(
  userPoint: ChartCoordinate,
  targetPoint: ChartCoordinate,
  priceRange: { min: number; max: number },
  timeRange: { min: number; max: number }
): number {
  // Calculate normalized differences (0-1 range)
  const priceDiff = Math.abs(targetPoint.y - userPoint.y);
  const timeDiff = Math.abs(targetPoint.x - userPoint.x);
  
  const priceRangeSize = priceRange.max - priceRange.min;
  const timeRangeSize = timeRange.max - timeRange.min;
  
  // Normalize differences to percentage of range
  const priceError = priceRangeSize > 0 ? priceDiff / priceRangeSize : 0;
  const timeError = timeRangeSize > 0 ? timeDiff / timeRangeSize : 0;
  
  // Weight price accuracy more heavily (70% price, 30% time)
  // Since price prediction is more important than exact timing
  const weightedError = priceError * 0.7 + timeError * 0.3;
  
  // Convert error to score (0% error = 100 points, 100% error = 0 points)
  // Use exponential decay for more forgiving scoring near perfect
  const score = Math.max(0, 100 * (1 - weightedError));
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
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
