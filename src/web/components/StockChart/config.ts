import type { ChartConfig, ChartType } from "./StockChart.types";

export const getChartConfig = (isMobile: boolean, chartType: ChartType = "default"): ChartConfig => {
  const config: ChartConfig = {
    PRICE_HEIGHT: 500,
    VOLUME_HEIGHT: 100,
    PADDING: {
      left: isMobile ? 40 : 60,
      right: isMobile ? 10 : 20,
      top: isMobile ? 10 : 20,
      bottom: isMobile ? 20 : 30,
    },
    BAR_WIDTH: isMobile ? 4 : 6,
    BAR_PADDING: isMobile ? 1 : 2,
    PRICE_TICKS: isMobile ? 5 : 8,
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
    SMA_LINE_WIDTH: isMobile ? 1.5 : 2,
    SMA_LINE_OPACITY: 0.9,
    BACKGROUND: "#000000",
  };

  if (chartType === "after") {
    config.COLORS = {
      ...config.COLORS,
      UP: "#00C853",
      DOWN: "#FF1744",
      VOLUME: "#42A5F5",
      SMA10: "#00D4FF",
      SMA20: "#7C3AED",
      SMA50: "#F59E0B",
      GRID: "#444444",
      TEXT: "#ffffff",
    };
    config.BACKGROUND = "transparent";
  }

  if (chartType === "hourly") {
    config.COLORS = {
      ...config.COLORS,
      SMA10: "#00D4FF",
      SMA20: "#7C3AED",
      SMA50: "#F59E0B",
    };
    config.SMA_LINE_WIDTH = isMobile ? 1.5 : 2.5;
    config.SMA_LINE_OPACITY = 0.95;
  }

  if (chartType === "default" || chartType === "D") {
    config.PADDING.top = isMobile ? 20 : 30;
  }

  if (chartType === "previous") {
    config.PADDING.top = 0;
    config.PADDING.bottom = 0;
  }

  if (isMobile) {
    config.SMA_LINE_WIDTH = 1.5;
    config.SMA_LINE_OPACITY = 0.95;
  }

  return config;
};

