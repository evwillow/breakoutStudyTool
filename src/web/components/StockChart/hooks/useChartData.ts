import { useMemo } from "react";
import type { ChartType, ProcessedStockDataPoint } from "../StockChart.types";
import { processChartData } from "../utils/calculations";

interface UseChartDataParams {
  chartData: unknown;
  afterData: unknown | null;
  chartType: ChartType;
  progressPercentage: number;
}

interface UseChartDataResult {
  stockData: ProcessedStockDataPoint[];
  afterStockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  shouldShowBackground: boolean;
}

export const useChartData = ({
  chartData,
  afterData,
  chartType,
  progressPercentage
}: UseChartDataParams): UseChartDataResult => {
  const normalizedChartData = useMemo(() => {
    if (Array.isArray(chartData)) {
      return chartData;
    }

    if (typeof chartData === "string") {
      try {
        const parsed = JSON.parse(chartData);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        console.error("Failed to parse chartData string:", error);
      }
    }

    return [];
  }, [chartData]);

  const normalizedAfterData = useMemo(() => {
    if (Array.isArray(afterData)) {
      return afterData;
    }

    if (typeof afterData === "string") {
      try {
        const parsed = JSON.parse(afterData);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        console.error("Failed to parse afterData string:", error);
      }
    }

    return [];
  }, [afterData]);

  const hasValidChartData = normalizedChartData.length > 0;

  const stockData = useMemo<ProcessedStockDataPoint[]>(
    () => {
      if (!hasValidChartData) {
        return [];
      }
      return processChartData(normalizedChartData, chartType);
    },
    [normalizedChartData, chartType, hasValidChartData]
  );

  const afterStockData = useMemo<ProcessedStockDataPoint[]>(() => {
    if (normalizedAfterData.length === 0) {
      return [];
    }

    const processedAfterData = processChartData(normalizedAfterData, chartType);
    return processedAfterData;
  }, [normalizedAfterData, chartType]);

  const hasSMA10 = useMemo(
    () =>
      stockData.some(
        item =>
          item.sma10 !== null && item.sma10 !== undefined && !isNaN(Number(item.sma10))
      ),
    [stockData]
  );

  const hasSMA20 = useMemo(
    () =>
      stockData.some(
        item =>
          item.sma20 !== null && item.sma20 !== undefined && !isNaN(Number(item.sma20))
      ),
    [stockData]
  );

  const hasSMA50 = useMemo(
    () =>
      stockData.some(
        item =>
          item.sma50 !== null && item.sma50 !== undefined && !isNaN(Number(item.sma50))
      ),
    [stockData]
  );

  const visibleAfterData = useMemo<ProcessedStockDataPoint[]>(() => {
    if (!afterStockData.length) return [];

    const totalAfterBars = afterStockData.length;
    const visibleBars = Math.floor(totalAfterBars * (progressPercentage / 100));
    return afterStockData.slice(0, visibleBars);
  }, [afterStockData, progressPercentage]);

  const shouldShowBackground = useMemo(
    () => visibleAfterData.length > 0,
    [visibleAfterData]
  );

  return {
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    shouldShowBackground
  };
};

