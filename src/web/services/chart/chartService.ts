import type { ChartType, ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';
import { processChartData } from './technicalIndicators';

export const normalizeChartInput = (data: unknown): unknown[] => {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return [];
  }

  // Handle arrays directly
  if (Array.isArray(data)) {
    return data.length > 0 ? data : [];
  }

  // Handle string data (JSON)
  if (typeof data === 'string') {
    if (data.trim() === '') {
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : [];
      }
      // If parsed is an object, try to extract array from common properties
      if (parsed && typeof parsed === 'object') {
        if ('value' in parsed && Array.isArray(parsed.value)) {
          return parsed.value.length > 0 ? parsed.value : [];
        }
        if ('data' in parsed && Array.isArray(parsed.data)) {
          return parsed.data.length > 0 ? parsed.data : [];
        }
        // If object has array-like structure, try Object.values
        const values = Object.values(parsed);
        if (values.length > 0 && Array.isArray(values[0])) {
          return values[0].length > 0 ? values[0] : [];
        }
      }
    } catch (error) {
      console.error('Failed to parse chart data string:', error);
      return [];
    }
  }

  // Handle objects that might contain arrays
  if (typeof data === 'object' && data !== null) {
    if ('value' in data && Array.isArray((data as { value: unknown[] }).value)) {
      const value = (data as { value: unknown[] }).value;
      return value.length > 0 ? value : [];
    }
    if ('data' in data && Array.isArray((data as { data: unknown[] }).data)) {
      const dataArray = (data as { data: unknown[] }).data;
      return dataArray.length > 0 ? dataArray : [];
    }
    // Try Object.values as fallback
    const values = Object.values(data);
    if (values.length > 0 && Array.isArray(values[0])) {
      return values[0].length > 0 ? values[0] : [];
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

