/**
 * @fileoverview Shared chart configuration and coordinate type definitions.
 * @module lib/shared/src/types/chart.ts
 * @dependencies none
 */
/**
 * Chart Types
 * 
 * Centralized type definitions for chart components and visualizations.
 * Note: D3-specific types (ScaleLinear, ScalePoint, Line) are kept in component-specific files
 * as they depend on d3-scale and d3-shape packages.
 */

/**
 * Chart type identifier
 */
export type ChartType = 'default' | 'D' | 'after' | 'hourly' | 'H' | 'previous' | 'monthly' | 'M' | 'minute' | 'W' | 'weekly' | string;

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
  chartType: ChartType;
  isMobile: boolean;
}

/**
 * Processed stock data point
 */
export interface ProcessedStockDataPoint {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  "10sma"?: number;
  "20sma"?: number;
  "50sma"?: number;
  index: number;
}

/**
 * Chart coordinate
 */
export interface ChartCoordinate {
  x: number;
  y: number;
  chartX?: number;
  chartY?: number;
}

/**
 * Chart click handler
 */
export type ChartClickHandler = (coordinate: ChartCoordinate) => void;

/**
 * Chart dimensions
 */
export interface ChartDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  priceHeight: number;
  volumeHeight: number;
}

/**
 * Chart scales
 * Note: Actual D3 scale types are defined in component-specific files
 */
export interface ChartScales {
  xScale: any; // ScalePoint<number> - defined in component
  yScale: any; // ScaleLinear<number, number> - defined in component
  volumeScale: any; // ScaleLinear<number, number> - defined in component
  sma10Line: any; // Line<ProcessedStockDataPoint> - defined in component
  sma20Line: any; // Line<ProcessedStockDataPoint> - defined in component
  sma50Line: any; // Line<ProcessedStockDataPoint> - defined in component
}

/**
 * Last dimensions (for comparison)
 */
export interface LastDimensions {
  width: number;
  height: number;
}

/**
 * Drag start position
 */
export interface DragStartPos {
  x: number;
  y: number;
}

/**
 * Container ref extension
 */
export interface ContainerRef extends HTMLDivElement {
  handleChartClick?: ChartClickHandler;
}

/**
 * Stock chart props
 */
export interface StockChartProps {
  data: unknown;
  showSMA?: boolean;
  chartType?: ChartType;
  isMobile?: boolean;
  onChartClick?: ChartClickHandler | null;
  userSelection?: ChartCoordinate | null;
  distance?: number | null;
  score?: number | null;
  targetPoint?: ChartCoordinate | null;
}

/**
 * Candlestick data
 */
export interface CandlestickData {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isUp: boolean;
}

/**
 * Volume bar data
 */
export interface VolumeBarData {
  x: number;
  volume: number;
  isUp: boolean;
}

