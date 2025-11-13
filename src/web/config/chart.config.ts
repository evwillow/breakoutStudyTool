/**
 * @fileoverview Chart display settings, colors, dimensions, and visual configuration.
 * @module src/web/config/chart.config.ts
 */
import type { ChartConfig, ChartType } from '@/components/StockChart/StockChart.types';

/**
 * Base Chart Colors
 * Default color palette for stock charts
 */
export const CHART_COLORS = {
  UP: "#00C853",
  DOWN: "#FF1744",
  VOLUME: "#29B6F6",
  GRID: "#1a1a1a",
  SMA10: "#00D4FF",
  SMA20: "#7C3AED",
  SMA50: "#F59E0B",
  TEXT: "#ffffff",
} as const;

/**
 * After Chart Colors
 * Color palette for "after" chart overlays
 */
export const AFTER_CHART_COLORS = {
  UP: "#00C853",
  DOWN: "#FF1744",
  VOLUME: "#42A5F5",
  SMA10: "#00D4FF",
  SMA20: "#7C3AED",
  SMA50: "#F59E0B",
  GRID: "#444444",
  TEXT: "#ffffff",
} as const;

/**
 * Chart Dimensions Configuration
 */
export const CHART_DIMENSIONS = {
  /** Default price chart height in pixels */
  PRICE_HEIGHT: 500,
  /** Default volume chart height in pixels */
  VOLUME_HEIGHT: 100,
  /** Default padding configuration */
  PADDING: {
    DESKTOP: {
      left: 60,
      right: 20,
      top: 20,
      bottom: 30,
    },
    MOBILE: {
      left: 40,
      right: 10,
      top: 10,
      bottom: 20,
    },
  },
} as const;

/**
 * Chart Bar Configuration
 */
export const CHART_BAR_CONFIG = {
  /** Bar width in pixels (desktop) */
  DESKTOP_WIDTH: 6,
  /** Bar width in pixels (mobile) */
  MOBILE_WIDTH: 4,
  /** Bar padding in pixels (desktop) */
  DESKTOP_PADDING: 2,
  /** Bar padding in pixels (mobile) */
  MOBILE_PADDING: 1,
} as const;

/**
 * Chart Ticks Configuration
 */
export const CHART_TICKS = {
  /** Number of price axis ticks (desktop) */
  DESKTOP_PRICE_TICKS: 8,
  /** Number of price axis ticks (mobile) */
  MOBILE_PRICE_TICKS: 5,
} as const;

/**
 * SMA (Simple Moving Average) Configuration
 */
export const SMA_CONFIG = {
  /** Line width in pixels (desktop) */
  DESKTOP_LINE_WIDTH: 2,
  /** Line width in pixels (mobile) */
  MOBILE_LINE_WIDTH: 1.5,
  /** Line opacity (0-1) */
  LINE_OPACITY: 0.9,
  /** Line opacity for hourly charts */
  HOURLY_LINE_OPACITY: 0.95,
} as const;

/**
 * Chart Background Configuration
 */
export const CHART_BACKGROUND = {
  /** Default background color */
  DEFAULT: "#000000",
  /** Transparent background for overlays */
  TRANSPARENT: "transparent",
} as const;

/**
 * Get chart configuration based on device type and chart type
 */
export const getChartConfig = (isMobile: boolean, chartType: ChartType = "default"): ChartConfig => {
  const padding = isMobile ? CHART_DIMENSIONS.PADDING.MOBILE : CHART_DIMENSIONS.PADDING.DESKTOP;
  const barWidth = isMobile ? CHART_BAR_CONFIG.MOBILE_WIDTH : CHART_BAR_CONFIG.DESKTOP_WIDTH;
  const barPadding = isMobile ? CHART_BAR_CONFIG.MOBILE_PADDING : CHART_BAR_CONFIG.DESKTOP_PADDING;
  const priceTicks = isMobile ? CHART_TICKS.MOBILE_PRICE_TICKS : CHART_TICKS.DESKTOP_PRICE_TICKS;
  const smaLineWidth = isMobile ? SMA_CONFIG.MOBILE_LINE_WIDTH : SMA_CONFIG.DESKTOP_LINE_WIDTH;

  const config: ChartConfig = {
    PRICE_HEIGHT: CHART_DIMENSIONS.PRICE_HEIGHT,
    VOLUME_HEIGHT: CHART_DIMENSIONS.VOLUME_HEIGHT,
    PADDING: {
      left: padding.left,
      right: padding.right,
      top: padding.top,
      bottom: padding.bottom,
    },
    BAR_WIDTH: barWidth,
    BAR_PADDING: barPadding,
    PRICE_TICKS: priceTicks,
    COLORS: { ...CHART_COLORS },
    SMA_LINE_WIDTH: smaLineWidth,
    SMA_LINE_OPACITY: SMA_CONFIG.LINE_OPACITY,
    BACKGROUND: CHART_BACKGROUND.DEFAULT,
  };

  // Apply chart type specific overrides
  if (chartType === "after") {
    config.COLORS = { ...AFTER_CHART_COLORS };
    config.BACKGROUND = CHART_BACKGROUND.TRANSPARENT;
  }

  if (chartType === "hourly") {
    config.SMA_LINE_WIDTH = smaLineWidth === SMA_CONFIG.MOBILE_LINE_WIDTH 
      ? SMA_CONFIG.MOBILE_LINE_WIDTH 
      : 2.5;
    config.SMA_LINE_OPACITY = SMA_CONFIG.HOURLY_LINE_OPACITY;
  }

  if (chartType === "default" || chartType === "D") {
    config.PADDING.top = isMobile ? 20 : 30;
  }

  if (chartType === "previous") {
    config.PADDING.top = 0;
    config.PADDING.bottom = 0;
  }

  if (isMobile) {
    config.SMA_LINE_WIDTH = SMA_CONFIG.MOBILE_LINE_WIDTH;
    config.SMA_LINE_OPACITY = SMA_CONFIG.HOURLY_LINE_OPACITY;
  }

  return config;
};

