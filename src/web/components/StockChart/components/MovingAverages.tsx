import React from "react";
import type { Line } from "d3-shape";
import type {
  ChartConfig,
  ChartType,
  ProcessedStockDataPoint,
  ChartScales
} from "../StockChart.types";

interface MovingAveragesProps {
  shouldRenderSMA: boolean;
  chartType: ChartType;
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  sma10Line: Line<ProcessedStockDataPoint> | null;
  sma20Line: Line<ProcessedStockDataPoint> | null;
  sma50Line: Line<ProcessedStockDataPoint> | null;
  afterSma10Line: Line<ProcessedStockDataPoint> | null;
  afterSma20Line: Line<ProcessedStockDataPoint> | null;
  afterSma50Line: Line<ProcessedStockDataPoint> | null;
  stockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  showAfterAnimation: boolean;
  afterAnimationComplete: boolean;
  CHART_CONFIG: ChartConfig;
  scales: ChartScales;
}

const MovingAverages: React.FC<MovingAveragesProps> = ({
  shouldRenderSMA,
  chartType,
  hasSMA10,
  hasSMA20,
  hasSMA50,
  sma10Line,
  sma20Line,
  sma50Line,
  afterSma10Line,
  afterSma20Line,
  afterSma50Line,
  stockData,
  visibleAfterData,
  showAfterAnimation,
  afterAnimationComplete,
  CHART_CONFIG,
  scales
}) => {
  if (!shouldRenderSMA || chartType === "monthly" || chartType === "M" || chartType === "minute") {
    return null;
  }

  const renderLine = (
    lineGenerator: Line<ProcessedStockDataPoint> | null,
    data: ProcessedStockDataPoint[],
    color: string
  ): React.ReactElement | null => {
    if (!lineGenerator) return null;

    try {
      const pathData = lineGenerator(data);
      if (!pathData) return null;

      return (
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
          strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
        />
      );
    } catch (error) {
      console.error("Error generating SMA path:", error);
      return null;
    }
  };

  // For previous charts and D charts, combine stockData and visibleAfterData into one continuous line
  const isDChart = chartType === "default" || chartType === "D";
  const shouldCombineData = (chartType === "previous" || isDChart) && visibleAfterData.length > 0;
  const combinedData = shouldCombineData
    ? [...stockData, ...visibleAfterData]
    : null;

  return (
    <>
      {shouldCombineData && combinedData ? (
        // For previous charts and D charts, render combined lines that span all data (connected)
        <>
          {renderLine(sma10Line, combinedData, CHART_CONFIG.COLORS.SMA10)}
          {renderLine(sma20Line, combinedData, CHART_CONFIG.COLORS.SMA20)}
          {renderLine(sma50Line, combinedData, CHART_CONFIG.COLORS.SMA50)}
        </>
      ) : (
        // For other chart types, render main and after lines separately
        <>
          {renderLine(sma10Line, stockData, CHART_CONFIG.COLORS.SMA10)}
          {renderLine(sma20Line, stockData, CHART_CONFIG.COLORS.SMA20)}
          {renderLine(sma50Line, stockData, CHART_CONFIG.COLORS.SMA50)}

          {((scales.isZoomedOut && (showAfterAnimation || afterAnimationComplete))) &&
            visibleAfterData.length > 0 &&
            chartType !== "monthly" &&
            chartType !== "M" &&
            chartType !== "minute" && (
              <>
                {renderLine(afterSma10Line, visibleAfterData, CHART_CONFIG.COLORS.SMA10)}
                {renderLine(afterSma20Line, visibleAfterData, CHART_CONFIG.COLORS.SMA20)}
                {renderLine(afterSma50Line, visibleAfterData, CHART_CONFIG.COLORS.SMA50)}
              </>
            )}
        </>
      )}
    </>
  );
};

export default MovingAverages;

