/**
 * @fileoverview Scale calculation hook for StockChart rendering.
 * @module src/web/components/StockChart/hooks/useChartScale.ts
 * @dependencies React, d3-scale, ../types
 */

import { useMemo } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import type { ChartType } from "@breakout-study-tool/shared";
import type {
  ChartConfig,
  ChartDataSummary,
  ChartScales,
  Dimensions,
  NormalizedCandle,
} from "../types";

interface UseChartScaleOptions {
  summary: ChartDataSummary;
  config: ChartConfig;
  dimensions: Dimensions | null;
  chartType?: ChartType;
  zoomPercentage?: number;
  tightPadding?: boolean;
  showAfterAnimation?: boolean;
}

interface ChartScaleResult {
  scales: ChartScales | null;
  showVolume: boolean;
}

function collectPriceExtents(candles: NormalizedCandle[], includeSMA = true): [number, number] | null {
  if (!candles.length) {
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  candles.forEach((candle) => {
    min = Math.min(min, candle.low, candle.close, candle.open);
    max = Math.max(max, candle.high, candle.close, candle.open);
    if (includeSMA) {
      if (typeof candle.sma10 === "number") {
        min = Math.min(min, candle.sma10);
        max = Math.max(max, candle.sma10);
      }
      if (typeof candle.sma20 === "number") {
        min = Math.min(min, candle.sma20);
        max = Math.max(max, candle.sma20);
      }
      if (typeof candle.sma50 === "number") {
        min = Math.min(min, candle.sma50);
        max = Math.max(max, candle.sma50);
      }
    }
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  if (min === max) {
    const padding = min === 0 ? 1 : Math.abs(min) * 0.05;
    return [min - padding, max + padding];
  }

  return [min, max];
}

function collectVolumeMax(candles: NormalizedCandle[]): number {
  let max = 0;
  candles.forEach((candle) => {
    if (Number.isFinite(candle.volume)) {
      max = Math.max(max, candle.volume);
    }
  });
  return max || 1;
}

export function useChartScale({
  summary,
  config,
  dimensions,
  chartType = "default",
  zoomPercentage = 0,
  tightPadding = false,
}: UseChartScaleOptions): ChartScaleResult {
  const scales = useMemo<ChartScales | null>(() => {
    if (!dimensions || !summary.candles.length) {
      return null;
    }

    const { innerWidth, innerHeight } = dimensions;
    const totalPoints = summary.candles.length + summary.afterCandles.length;
    const domainIndices = Array.from({ length: Math.max(totalPoints, summary.candles.length) }, (_, index) => index);

    const mainExtents = collectPriceExtents(summary.candles);
    if (!mainExtents) {
      return null;
    }

    const [mainMin, mainMax] = mainExtents;
    let targetMin = mainMin;
    let targetMax = mainMax;

    const afterExtents = collectPriceExtents(summary.afterCandles);
    const combinedMin = afterExtents ? Math.min(mainMin, afterExtents[0]) : mainMin;
    const combinedMax = afterExtents ? Math.max(mainMax, afterExtents[1]) : mainMax;

    const clampedZoom = Math.min(Math.max(zoomPercentage, 0), 100) / 100;

    if (chartType === "default" || chartType === "D") {
      const range = mainMax - mainMin || Math.abs(mainMax) || 1;
      const paddingAbove = range * 0.5;
      const paddingBelow = range * 0.1;
      targetMin = mainMin - paddingBelow;
      targetMax = mainMax + paddingAbove;
    } else if (afterExtents) {
      targetMin = mainMin + (combinedMin - mainMin) * clampedZoom;
      targetMax = mainMax + (combinedMax - mainMax) * clampedZoom;
    }

    const priceRange = targetMax - targetMin || 1;
    const pricePadding = tightPadding || chartType === "previous" ? 0 : priceRange * 0.2;

    const showVolume = chartType !== "previous";
    const priceHeight = showVolume ? innerHeight * 0.75 : innerHeight;
    const volumeHeight = showVolume ? innerHeight - priceHeight : 0;

    const priceScale = scaleLinear<number, number>()
      .domain([targetMin - pricePadding, targetMax + pricePadding])
      .range([priceHeight, 0]);

    const volumeMax = collectVolumeMax(summary.candles);
    const volumeScale = scaleLinear<number, number>()
      .domain([0, volumeMax * (showVolume ? 1.1 : 1)])
      .range([volumeHeight, 0]);

    const xScale = scalePoint<number>()
      .domain(domainIndices)
      .range([0, innerWidth])
      .padding(0.5);

    return {
      xScale,
      priceScale,
      volumeScale,
      priceHeight,
      volumeHeight,
      innerWidth,
    };
  }, [summary, dimensions, chartType, zoomPercentage, tightPadding]);

  const showVolume = chartType !== "previous";

  return { scales, showVolume };
}
