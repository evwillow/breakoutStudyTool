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
 * Calculate distance-based score (0-100)
 * Lower distance = higher score
 */
export function calculateDistanceScore(
  distance: number,
  maxDistance: number
): number {
  if (maxDistance === 0) return 100;
  
  // Score decreases linearly with distance
  // Perfect (distance 0) = 100 points
  // Max distance = 0 points
  const score = Math.max(0, 100 * (1 - distance / maxDistance));
  
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
  emoji: string;
} {
  if (score >= 90) {
    return { tier: 'Excellent', color: 'text-green-500', emoji: '🎯' };
  } else if (score >= 70) {
    return { tier: 'Great', color: 'text-green-400', emoji: '👍' };
  } else if (score >= 50) {
    return { tier: 'Good', color: 'text-yellow-400', emoji: '😊' };
  } else if (score >= 30) {
    return { tier: 'Fair', color: 'text-orange-400', emoji: '🤔' };
  } else {
    return { tier: 'Needs Work', color: 'text-red-400', emoji: '📈' };
  }
}
