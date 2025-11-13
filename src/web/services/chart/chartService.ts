import type { ChartType, ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';
import { processChartData } from './technicalIndicators';

export const normalizeChartInput = (data: unknown): unknown[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse chart data string:', error);
    }
  }

  return [];
};

interface PrepareChartDataParams {
  normalizedChartData: unknown[];
  normalizedAfterData: unknown[];
  chartType: ChartType;
  progressPercentage: number;
}

export interface PreparedChartData {
  stockData: ProcessedStockDataPoint[];
  afterStockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  shouldShowBackground: boolean;
}

export const prepareChartData = ({
  normalizedChartData,
  normalizedAfterData,
  chartType,
  progressPercentage,
}: PrepareChartDataParams): PreparedChartData => {
  const hasValidChartData = normalizedChartData.length > 0;

  const stockData = hasValidChartData
    ? processChartData(normalizedChartData, chartType)
    : [];

  const afterStockData =
    normalizedAfterData.length > 0
      ? processChartData(normalizedAfterData, chartType)
      : [];

  const hasSMA10 = stockData.some(
    item => item.sma10 !== null && item.sma10 !== undefined && !Number.isNaN(Number(item.sma10))
  );
  const hasSMA20 = stockData.some(
    item => item.sma20 !== null && item.sma20 !== undefined && !Number.isNaN(Number(item.sma20))
  );
  const hasSMA50 = stockData.some(
    item => item.sma50 !== null && item.sma50 !== undefined && !Number.isNaN(Number(item.sma50))
  );

  const visibleAfterData = (() => {
    if (!afterStockData.length) return [];

    const totalAfterBars = afterStockData.length;
    const visibleBars = Math.floor(totalAfterBars * (progressPercentage / 100));
    return afterStockData.slice(0, visibleBars);
  })();

  const shouldShowBackground = visibleAfterData.length > 0;

  return {
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    shouldShowBackground,
  };
};

