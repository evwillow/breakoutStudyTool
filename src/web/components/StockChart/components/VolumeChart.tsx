/**
 * @fileoverview Volume bar renderer for StockChart.
 * @module src/web/components/StockChart/components/VolumeChart.tsx
 * @dependencies React, ../types
 */

import React, { useMemo } from "react";
import type { ChartConfig, ChartDataSummary, ChartScales } from "../types";

interface VolumeChartProps {
  summary: ChartDataSummary;
  scales: ChartScales;
  config: ChartConfig;
  showVolume: boolean;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ summary, scales, config, showVolume }) => {
  const barWidth = useMemo(() => {
    const domain = scales.xScale.domain();
    if (domain.length <= 1) {
      return config.BAR_WIDTH;
    }
    const first = scales.xScale(domain[0]);
    const second = scales.xScale(domain[1]);
    if (typeof first === "number" && typeof second === "number") {
      return Math.max(Math.abs(second - first) - config.BAR_PADDING * 2, 1);
    }
    return config.BAR_WIDTH;
  }, [scales, config]);

  if (!showVolume) {
    return null;
  }

  return (
    <g transform={`translate(0, ${scales.priceHeight + 24})`}>
      {summary.candles.map((candle) => {
        const center = scales.xScale(candle.index);
        if (typeof center !== "number") {
          return null;
        }
        const height = scales.volumeScale(0) - scales.volumeScale(candle.volume);
        const isUp = candle.close >= candle.open;
        return (
          <rect
            key={`vol-${candle.index}`}
            x={center - barWidth / 2}
            y={scales.volumeScale(candle.volume)}
            width={barWidth}
            height={Math.max(height, 1)}
            fill={isUp ? config.COLORS.UP : config.COLORS.DOWN}
            fillOpacity={0.35}
          />
        );
      })}
    </g>
  );
};
