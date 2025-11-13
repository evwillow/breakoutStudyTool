/**
 * @fileoverview Shared type definitions for the refactored StockChart module.
 * @module src/web/components/StockChart/types.ts
 * @dependencies d3-scale, @breakout-study-tool/shared
 */

import type { ScaleLinear, ScalePoint } from "d3-scale";
import type React from "react";
import type {
  ChartClickHandler,
  ChartCoordinate,
  ChartType,
} from "@breakout-study-tool/shared";

export interface ChartColors {
  UP: string;
  DOWN: string;
  VOLUME: string;
  GRID: string;
  SMA10: string;
  SMA20: string;
  SMA50: string;
  TEXT: string;
}

export interface ChartPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ChartConfig {
  PRICE_HEIGHT: number;
  VOLUME_HEIGHT: number;
  PADDING: ChartPadding;
  BAR_WIDTH: number;
  BAR_PADDING: number;
  PRICE_TICKS: number;
  COLORS: ChartColors;
  SMA_LINE_WIDTH: number;
  SMA_LINE_OPACITY: number;
  BACKGROUND: string;
}

export interface NormalizedCandle {
  index: number;
  timestamp?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma10?: number | null;
  sma20?: number | null;
  sma50?: number | null;
}

export interface ChartScales {
  xScale: ScalePoint<number>;
  priceScale: ScaleLinear<number, number>;
  volumeScale: ScaleLinear<number, number>;
  priceHeight: number;
  volumeHeight: number;
  innerWidth: number;
}

export interface Dimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: ChartPadding;
}

export interface StockChartProps {
  data?: unknown;
  csvData?: unknown;
  afterData?: unknown | null;
  showSMA?: boolean;
  includeAuth?: boolean;
  chartType?: ChartType;
  height?: number | null;
  backgroundColor?: string | null;
  showAfterAnimation?: boolean;
  progressPercentage?: number;
  zoomPercentage?: number;
  isInDelayPhase?: boolean;
  afterAnimationComplete?: boolean;
  forceShowSMA?: boolean;
  tightPadding?: boolean;
  onChartClick?: ChartClickHandler | null;
  userSelection?: ChartCoordinate | null;
  targetPoint?: ChartCoordinate | null;
  disabled?: boolean;
  timerRightEdge?: number | null;
  timerLeftEdge?: number | null;
  dLabelRightEdge?: number | null;
  dLabelCenterY?: number | null;
}

export interface InteractionHandlers {
  handleChartClick: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseMove: (event: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseLeave: () => void;
  handleTouchStart: (event: React.TouchEvent<SVGSVGElement>) => void;
  handleTouchMove: (event: React.TouchEvent<SVGSVGElement>) => void;
  handleTouchEnd: () => void;
}

export interface ChartDataSummary {
  candles: NormalizedCandle[];
  afterCandles: NormalizedCandle[];
  visibleAfterCandles: NormalizedCandle[];
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  shouldShowAfterMask: boolean;
}
