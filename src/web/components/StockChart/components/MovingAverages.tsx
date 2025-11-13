/**
 * @fileoverview Moving average overlays for StockChart price view.
 * @module src/web/components/StockChart/components/MovingAverages.tsx
 * @dependencies React, d3-shape, ../types
 */

import React, { useMemo } from "react";
import { line } from "d3-shape";
import type { ChartConfig, ChartDataSummary, ChartScales } from "../types";

interface MovingAveragesProps {
  summary: ChartDataSummary;
  scales: ChartScales;
  config: ChartConfig;
}

function buildPath(
  data: { index: number; value: number | null | undefined }[],
  scales: ChartScales,
): string | null {
  const generator = line<{ index: number; value: number | null | undefined }>()
    .defined((point) => typeof point.value === "number" && Number.isFinite(point.value))
    .x((point) => scales.xScale(point.index) ?? 0)
    .y((point) => scales.priceScale(point.value as number));

  return generator(data) ?? null;
}

export const MovingAverages: React.FC<MovingAveragesProps> = ({ summary, scales, config }) => {
  const combinedSeries = useMemo(() => {
    const base = summary.candles.map((candle) => ({
      index: candle.index,
      sma10: candle.sma10,
      sma20: candle.sma20,
      sma50: candle.sma50,
    }));

    if (!summary.visibleAfterCandles.length) {
      return base;
    }

    const offset = summary.candles.length;
    const afterSeries = summary.visibleAfterCandles.map((candle) => ({
      index: offset + candle.index,
      sma10: candle.sma10,
      sma20: candle.sma20,
      sma50: candle.sma50,
    }));

    return [...base, ...afterSeries];
  }, [summary]);

  const sma10Path = summary.hasSMA10
    ? buildPath(
        combinedSeries.map((point) => ({ index: point.index, value: point.sma10 })),
        scales,
      )
    : null;
  const sma20Path = summary.hasSMA20
    ? buildPath(
        combinedSeries.map((point) => ({ index: point.index, value: point.sma20 })),
        scales,
      )
    : null;
  const sma50Path = summary.hasSMA50
    ? buildPath(
        combinedSeries.map((point) => ({ index: point.index, value: point.sma50 })),
        scales,
      )
    : null;

  return (
    <g pointerEvents="none">
      {sma10Path && (
        <path
          d={sma10Path}
          fill="none"
          stroke={config.COLORS.SMA10}
          strokeWidth={config.SMA_LINE_WIDTH}
          strokeOpacity={config.SMA_LINE_OPACITY}
        />
      )}
      {sma20Path && (
        <path
          d={sma20Path}
          fill="none"
          stroke={config.COLORS.SMA20}
          strokeWidth={config.SMA_LINE_WIDTH}
          strokeOpacity={config.SMA_LINE_OPACITY}
        />
      )}
      {sma50Path && (
        <path
          d={sma50Path}
          fill="none"
          stroke={config.COLORS.SMA50}
          strokeWidth={config.SMA_LINE_WIDTH}
          strokeOpacity={config.SMA_LINE_OPACITY}
        />
      )}
    </g>
  );
};
