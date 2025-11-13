/**
 * @fileoverview Memoized data preparation hook for StockChart.
 * @module src/web/components/StockChart/hooks/useChartData.ts
 * @dependencies React, ../types, ../utils/calculations
 */

import { useMemo } from "react";
import type { ChartType } from "@breakout-study-tool/shared";
import type { ChartDataSummary } from "../types";
import { normalizeDataset, resolveVisibleAfterData } from "../utils/calculations";

interface UseChartDataOptions {
  data?: unknown;
  afterData?: unknown | null;
  chartType?: ChartType;
  progressPercentage?: number;
  showAfterAnimation?: boolean;
}

export function useChartData({
  data,
  afterData,
  chartType = "default",
  progressPercentage = 0,
  showAfterAnimation = false,
}: UseChartDataOptions): ChartDataSummary {
  const candles = useMemo(
    () => normalizeDataset(data, chartType),
    [data, chartType],
  );

  const afterCandles = useMemo(
    () => normalizeDataset(afterData, chartType),
    [afterData, chartType],
  );

  const visibleAfterCandles = useMemo(
    () =>
      showAfterAnimation
        ? resolveVisibleAfterData(afterCandles, progressPercentage)
        : [],
    [afterCandles, progressPercentage, showAfterAnimation],
  );

  const hasSMA10 = candles.some((candle) => candle.sma10 !== null && candle.sma10 !== undefined);
  const hasSMA20 = candles.some((candle) => candle.sma20 !== null && candle.sma20 !== undefined);
  const hasSMA50 = candles.some((candle) => candle.sma50 !== null && candle.sma50 !== undefined);

  return {
    candles,
    afterCandles,
    visibleAfterCandles,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    shouldShowAfterMask: showAfterAnimation && visibleAfterCandles.length > 0,
  };
}
