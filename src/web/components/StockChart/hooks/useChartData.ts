import { useMemo } from "react";
import type { ChartType } from "../StockChart.types";
import type { ProcessedStockDataPoint } from "../StockChart.types";
import { normalizeChartInput, prepareChartData } from "@/services/chart/chartService";

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
  const normalizedChartData = useMemo(
    () => normalizeChartInput(chartData),
    [chartData]
  );

  const normalizedAfterData = useMemo(
    () => normalizeChartInput(afterData ?? []),
    [afterData]
  );

  const preparedData = useMemo(
    () =>
      prepareChartData({
        normalizedChartData,
        normalizedAfterData,
        chartType,
        progressPercentage
      }),
    [normalizedChartData, normalizedAfterData, chartType, progressPercentage]
  );

  return {
    stockData: preparedData.stockData,
    afterStockData: preparedData.afterStockData,
    visibleAfterData: preparedData.visibleAfterData,
    hasSMA10: preparedData.hasSMA10,
    hasSMA20: preparedData.hasSMA20,
    hasSMA50: preparedData.hasSMA50,
    shouldShowBackground: preparedData.shouldShowBackground
  };
};
