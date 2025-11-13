import type { ScaleLinear, ScalePoint } from "d3-scale";
import type { Line } from "d3-shape";
import type { 
  ChartType, 
  ChartCoordinate, 
  ChartClickHandler 
} from '@breakout-study-tool/shared';

// Re-export shared types for convenience
export type { ChartType, ChartCoordinate, ChartClickHandler };

/**
 * Chart color configuration
 */
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

/**
 * Chart padding configuration
 */
export interface ChartPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Chart configuration object
 */
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

/**
 * Props for MemoizedChartConfig component
 */
export interface MemoizedChartConfigProps {
  isMobile: boolean;
  chartType: ChartType;
}

/**
 * Stock data point with flexible property names
 * Supports both uppercase and lowercase property names
 */
export interface ProcessedStockDataPoint {
  [key: string]: unknown;
  open?: number;
  Open?: number;
  high?: number;
  High?: number;
  low?: number;
  Low?: number;
  close?: number;
  Close?: number;
  volume?: number;
  Volume?: number;
  sma10?: number | null;
  SMA10?: number | null;
  ma10?: number | null;
  MA10?: number | null;
  ema10?: number | null;
  EMA10?: number | null;
  '10sma'?: number | null;
  '10SMA'?: number | null;
  sma20?: number | null;
  SMA20?: number | null;
  ma20?: number | null;
  MA20?: number | null;
  ema20?: number | null;
  EMA20?: number | null;
  '20sma'?: number | null;
  '20SMA'?: number | null;
  sma50?: number | null;
  SMA50?: number | null;
  ma50?: number | null;
  MA50?: number | null;
  ema50?: number | null;
  EMA50?: number | null;
  '50sma'?: number | null;
  '50SMA'?: number | null;
  json?: string;
}

// ChartCoordinate and ChartClickHandler are imported from shared types above

/**
 * Dimensions interface for chart container
 */
export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  innerWidth: number;
  innerHeight: number;
}

/**
 * Chart scales interface
 */
export interface ChartScales {
  priceScale: ScaleLinear<number, number>;
  volumeScale: ScaleLinear<number, number>;
  xScale: ScalePoint<number>;
  priceHeight: number;
  volumeHeight: number;
  useFullDomain: boolean;
  lastPrice: number | undefined;
  isZoomedOut: boolean;
  extendedDomain: boolean;
}

/**
 * Last dimensions reference interface
 */
export interface LastDimensions {
  width: number;
  height: number;
}

/**
 * Drag start position interface
 */
export interface DragStartPos {
  x: number;
  y: number;
}

/**
 * Container ref interface with optional handleChartClick method
 */
export interface ContainerRef extends HTMLDivElement {
  handleChartClick?: ChartClickHandler;
}

/**
 * StockChart component props
 */
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

/**
 * Candlestick data interface
 */
export interface CandlestickData {
  x: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  width: number;
  isUp: boolean;
}

/**
 * Volume bar data interface
 */
export interface VolumeBarData {
  x: number;
  y: number;
  width: number;
  height: number;
}

