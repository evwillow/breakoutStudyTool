/**
 * @fileoverview Axis and grid rendering for StockChart.
 * @module src/web/components/StockChart/components/ChartAxis.tsx
 * @dependencies React, ../types, ../utils/formatters
 */

import React, { useMemo } from "react";
import type { ChartConfig, ChartScales } from "../types";
import { formatPrice } from "../utils/formatters";

interface ChartAxisProps {
  scales: ChartScales;
  config: ChartConfig;
}

export const ChartAxis: React.FC<ChartAxisProps> = ({ scales, config }) => {
  const priceTicks = useMemo(() => {
    const domain = scales.priceScale.domain();
    const step = (domain[1] - domain[0]) / config.PRICE_TICKS;
    return Array.from({ length: config.PRICE_TICKS + 1 }, (_, index) => domain[0] + step * index);
  }, [scales, config]);

  return (
    <g>
      {priceTicks.map((value, index) => {
        const y = scales.priceScale(value);
        return (
          <g key={`price-tick-${index}`}>
            <line
              x1={0}
              x2={scales.innerWidth}
              y1={y}
              y2={y}
              stroke={config.COLORS.GRID}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            <text
              x={-8}
              y={y + 4}
              fontSize={10}
              fill={config.COLORS.TEXT}
              textAnchor="end"
            >
              {formatPrice(value)}
            </text>
          </g>
        );
      })}
    </g>
  );
};
