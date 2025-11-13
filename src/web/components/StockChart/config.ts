/**
 * @fileoverview Chart configuration helpers for StockChart.
 * @module src/web/components/StockChart/config.ts
 * @dependencies ./types
 */

import type { ChartConfig } from "./types";
import type { ChartType } from "@breakout-study-tool/shared";

const BASE_CONFIG: ChartConfig = {
  PRICE_HEIGHT: 500,
  VOLUME_HEIGHT: 100,
  PADDING: {
    left: 60,
    right: 20,
    top: 20,
    bottom: 30,
  },
  BAR_WIDTH: 6,
  BAR_PADDING: 2,
  PRICE_TICKS: 8,
  COLORS: {
    UP: "#00C853",
    DOWN: "#FF1744",
    VOLUME: "#29B6F6",
    GRID: "#1a1a1a",
    SMA10: "#00D4FF",
    SMA20: "#7C3AED",
    SMA50: "#F59E0B",
    TEXT: "#ffffff",
  },
  SMA_LINE_WIDTH: 2,
  SMA_LINE_OPACITY: 0.9,
  BACKGROUND: "#000000",
};

export function getChartConfig(isMobile: boolean, chartType: ChartType = "default"): ChartConfig {
  const config: ChartConfig = {
    ...BASE_CONFIG,
    PADDING: {
      left: isMobile ? 40 : BASE_CONFIG.PADDING.left,
      right: isMobile ? 10 : BASE_CONFIG.PADDING.right,
      top: isMobile ? 20 : BASE_CONFIG.PADDING.top,
      bottom: isMobile ? 20 : BASE_CONFIG.PADDING.bottom,
    },
    BAR_WIDTH: isMobile ? 4 : BASE_CONFIG.BAR_WIDTH,
    BAR_PADDING: isMobile ? 1 : BASE_CONFIG.BAR_PADDING,
    PRICE_TICKS: isMobile ? 5 : BASE_CONFIG.PRICE_TICKS,
    SMA_LINE_WIDTH: isMobile ? 1.5 : BASE_CONFIG.SMA_LINE_WIDTH,
  };

  if (chartType === "after") {
    config.COLORS = {
      ...config.COLORS,
      VOLUME: "#42A5F5",
      GRID: "#444444",
    };
    config.BACKGROUND = "transparent";
  }

  if (chartType === "hourly" || chartType === "H") {
    config.SMA_LINE_WIDTH = isMobile ? 1.5 : 2.5;
    config.SMA_LINE_OPACITY = 0.95;
  }

  if (chartType === "previous") {
    config.PADDING = {
      left: isMobile ? 20 : 40,
      right: isMobile ? 10 : 20,
      top: 0,
      bottom: 0,
    };
  }

  return config;
}
