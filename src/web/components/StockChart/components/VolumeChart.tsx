import React from "react";
import type {
  VolumeBarData,
  ChartScales,
  ChartConfig,
  ChartType
} from "../StockChart.types";

interface VolumeChartProps {
  chartType: ChartType;
  scales: ChartScales;
  volumeBars: VolumeBarData[];
  afterVolumeBars: VolumeBarData[];
  showAfterAnimation: boolean;
  CHART_CONFIG: ChartConfig;
  backgroundColor: string | null;
}

const VolumeChart: React.FC<VolumeChartProps> = ({
  chartType,
  scales,
  volumeBars,
  afterVolumeBars,
  showAfterAnimation,
  CHART_CONFIG,
  backgroundColor
}) => {
  if (chartType === "previous") {
    return null;
  }

  return (
    <g transform={`translate(0, ${scales.priceHeight})`}>
      {volumeBars.length > 0 ? (
        <>
          {volumeBars.map((bar, i) => (
            <rect
              key={`vol-${i}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={CHART_CONFIG.COLORS.VOLUME}
              opacity={backgroundColor ? 0.6 : 0.3}
            />
          ))}
        </>
      ) : (
        <text x="10" y={scales.priceHeight + 20} fill="white" fontSize="12">
          No volume bars to render
        </text>
      )}

      {scales.isZoomedOut &&
        showAfterAnimation &&
        afterVolumeBars.map((bar, i) => (
          <rect
            key={`after-vol-${i}`}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={CHART_CONFIG.COLORS.VOLUME}
            opacity={0.5}
          />
        ))}
    </g>
  );
};

export default VolumeChart;

