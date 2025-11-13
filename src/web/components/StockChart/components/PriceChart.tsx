/**
 * @fileoverview SVG price chart renderer for StockChart.
 * @module src/web/components/StockChart/components/PriceChart.tsx
 * @dependencies React, ../types
 */

import React, { useMemo } from "react";
import type { ChartCoordinate } from "@breakout-study-tool/shared";
import type { ChartConfig, ChartDataSummary, ChartScales } from "../types";

interface PriceChartProps {
  summary: ChartDataSummary;
  scales: ChartScales;
  config: ChartConfig;
  showAfterAnimation?: boolean;
  shouldShowAfterMask?: boolean;
  userSelection?: ChartCoordinate | null;
  targetPoint?: ChartCoordinate | null;
}

const AFTER_FILL = "rgba(0, 200, 255, 0.1)";
const AFTER_STROKE = "#00D4FF";

function getDomainStep(scales: ChartScales, config: ChartConfig): number {
  const domain = scales.xScale.domain();
  if (domain.length <= 1) {
    return config.BAR_WIDTH;
  }
  const first = scales.xScale(domain[0]);
  const second = scales.xScale(domain[1]);
  if (typeof first === "number" && typeof second === "number") {
    return Math.max(Math.abs(second - first), config.BAR_WIDTH);
  }
  return config.BAR_WIDTH;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  summary,
  scales,
  config,
  showAfterAnimation = false,
  shouldShowAfterMask = false,
  userSelection,
  targetPoint,
}) => {
  const barWidth = useMemo(() => {
    const step = getDomainStep(scales, config);
    return Math.max(step - config.BAR_PADDING * 2, 1);
  }, [scales, config]);

  const afterVisibleCount = summary.visibleAfterCandles.length;

  return (
    <g>
      {summary.candles.map((candle) => {
        const center = scales.xScale(candle.index);
        if (typeof center !== "number") {
          return null;
        }
        const openY = scales.priceScale(candle.open);
        const closeY = scales.priceScale(candle.close);
        const highY = scales.priceScale(candle.high);
        const lowY = scales.priceScale(candle.low);
        const isUp = candle.close >= candle.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(openY - closeY), 1);

        return (
          <g key={`main-${candle.index}`}>
            <line
              x1={center}
              x2={center}
              y1={highY}
              y2={lowY}
              stroke={isUp ? config.COLORS.UP : config.COLORS.DOWN}
              strokeWidth={1}
            />
            <rect
              x={center - barWidth / 2}
              y={bodyTop}
              width={barWidth}
              height={bodyHeight}
              fill={isUp ? config.COLORS.UP : config.COLORS.DOWN}
            />
          </g>
        );
      })}

      {showAfterAnimation && summary.afterCandles.map((candle) => {
        const domainIndex = summary.candles.length + candle.index;
        const center = scales.xScale(domainIndex);
        if (typeof center !== "number") {
          return null;
        }
        const openY = scales.priceScale(candle.open);
        const closeY = scales.priceScale(candle.close);
        const highY = scales.priceScale(candle.high);
        const lowY = scales.priceScale(candle.low);
        const isUp = candle.close >= candle.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
        const isVisible = candle.index < afterVisibleCount;

        return (
          <g key={`after-${candle.index}`} opacity={isVisible ? 1 : 0.15}>
            <line
              x1={center}
              x2={center}
              y1={highY}
              y2={lowY}
              stroke={AFTER_STROKE}
              strokeWidth={1}
            />
            <rect
              x={center - barWidth / 2}
              y={bodyTop}
              width={barWidth}
              height={bodyHeight}
              fill={isUp ? AFTER_STROKE : AFTER_FILL}
              stroke={AFTER_STROKE}
              strokeWidth={1}
              fillOpacity={0.25}
            />
          </g>
        );
      })}

      {shouldShowAfterMask && summary.afterCandles.length > 0 && (
        (() => {
          const start = scales.xScale(summary.candles.length);
          if (typeof start !== "number") {
            return null;
          }
          return (
            <rect
              x={start - barWidth / 2}
              y={0}
              width={scales.innerWidth - (start - barWidth / 2)}
              height={scales.priceHeight}
              fill="rgba(0, 212, 255, 0.08)"
            />
          );
        })()
      )}

      {userSelection && typeof userSelection.x === "number" && (
        (() => {
          const center = scales.xScale(userSelection.x);
          if (typeof center !== "number") {
            return null;
          }
          const priceY = scales.priceScale(userSelection.y);
          return (
            <g key="user-selection" pointerEvents="none">
              <circle
                cx={center}
                cy={priceY}
                r={5}
                fill="rgba(255,255,255,0.9)"
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={2}
              />
            </g>
          );
        })()
      )}

      {targetPoint && typeof targetPoint.x === "number" && (
        (() => {
          const center = scales.xScale(targetPoint.x);
          if (typeof center !== "number") {
            return null;
          }
          const priceY = scales.priceScale(targetPoint.y);
          return (
            <g key="target-point" pointerEvents="none">
              <circle
                cx={center}
                cy={priceY}
                r={6}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </g>
          );
        })()
      )}
    </g>
  );
};
