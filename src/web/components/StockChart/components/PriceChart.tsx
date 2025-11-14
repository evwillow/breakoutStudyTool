import React from "react";
import type { Line } from "d3-shape";
import MovingAverages from "./MovingAverages";
import type {
  CandlestickData,
  ChartConfig,
  ChartCoordinate,
  ChartScales,
  ChartType,
  ChartClickHandler,
  ChartDimensions,
  ProcessedStockDataPoint
} from "../StockChart.types";

interface PriceChartProps {
  chartType: ChartType;
  isMobile: boolean;
  dimensions: ChartDimensions;
  scales: ChartScales;
  stockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  candlesticks: CandlestickData[];
  afterCandlesticks: CandlestickData[];
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  sma10Line: Line<ProcessedStockDataPoint> | null;
  sma20Line: Line<ProcessedStockDataPoint> | null;
  sma50Line: Line<ProcessedStockDataPoint> | null;
  afterSma10Line: Line<ProcessedStockDataPoint> | null;
  afterSma20Line: Line<ProcessedStockDataPoint> | null;
  afterSma50Line: Line<ProcessedStockDataPoint> | null;
  showSMA: boolean;
  forceShowSMA: boolean;
  CHART_CONFIG: ChartConfig;
  showAfterAnimation: boolean;
  afterAnimationComplete: boolean;
  userSelection: ChartCoordinate | null;
  targetPoint: ChartCoordinate | null;
  onChartClick: ChartClickHandler | null;
  disabled: boolean;
  backgroundColor: string | null;
  shouldShowDividerAndBackground: boolean;
  dividerLineX: number;
  darkBackgroundWidth: number;
  progressiveMaskWidth: number;
  afterStockDataLength: number;
}

const PriceChart: React.FC<PriceChartProps> = ({
  chartType,
  isMobile,
  dimensions,
  scales,
  stockData,
  visibleAfterData,
  candlesticks,
  afterCandlesticks,
  hasSMA10,
  hasSMA20,
  hasSMA50,
  sma10Line,
  sma20Line,
  sma50Line,
  afterSma10Line,
  afterSma20Line,
  afterSma50Line,
  showSMA,
  forceShowSMA,
  CHART_CONFIG,
  showAfterAnimation,
  afterAnimationComplete,
  userSelection,
  targetPoint,
  onChartClick,
  disabled,
  backgroundColor,
  shouldShowDividerAndBackground,
  dividerLineX,
  darkBackgroundWidth,
  progressiveMaskWidth,
  afterStockDataLength
}) => {
  const shouldRenderSMA = showSMA || forceShowSMA;

  const totalMainCount = stockData.length;
  const combinedCount = totalMainCount + afterStockDataLength;

  const calculateMainX = (index: number): number => {
    const x = scales.xScale(index);
    if (x !== undefined && !isNaN(x)) {
      return x;
    }

    const denominator = scales.isZoomedOut ? combinedCount : totalMainCount || 1;
    return index * (dimensions.innerWidth / denominator);
  };

  const calculateAfterX = (index: number): number => {
    const x = scales.xScale(index);
    if (x !== undefined && !isNaN(x)) {
      return x;
    }

    const denominator = combinedCount || 1;
    return index * (dimensions.innerWidth / denominator);
  };

  return (
    <>
      {/* Gray dotted line - always visible as a guide, same position as blue line */}
      {!shouldShowDividerAndBackground && chartType !== "previous" && (
        <line
          x1={dividerLineX}
          y1={0}
          x2={dividerLineX}
          y2={dimensions.height}
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeDasharray="4,4"
          opacity={0.5}
        />
      )}

      {shouldShowDividerAndBackground && !backgroundColor && chartType !== "previous" && (
        <>
          <line
            x1={dividerLineX}
            y1={0}
            x2={dividerLineX}
            y2={dimensions.height}
            stroke="#00FFFF"
            strokeWidth={2.5}
            opacity={1}
          />

          <rect
            x={dividerLineX}
            y={0}
            width={darkBackgroundWidth}
            height={dimensions.height}
            fill="rgba(0, 0, 0, 0.4)"
            opacity={1}
          />

          {progressiveMaskWidth > 0 && (
            <rect
              x={dividerLineX + darkBackgroundWidth - progressiveMaskWidth}
              y={0}
              width={progressiveMaskWidth}
              height={dimensions.height}
              fill={backgroundColor || "rgba(0, 0, 0, 0.5)"}
              opacity={1}
            />
          )}
        </>
      )}

      <g transform={`translate(${dimensions.margin.left || 0},${dimensions.margin.top || 0})`}>
        <g transform="translate(0, 0)">
          <MovingAverages
            shouldRenderSMA={shouldRenderSMA}
            chartType={chartType}
            hasSMA10={hasSMA10}
            hasSMA20={hasSMA20}
            hasSMA50={hasSMA50}
            sma10Line={sma10Line}
            sma20Line={sma20Line}
            sma50Line={sma50Line}
            afterSma10Line={afterSma10Line}
            afterSma20Line={afterSma20Line}
            afterSma50Line={afterSma50Line}
            stockData={stockData}
            visibleAfterData={visibleAfterData}
            showAfterAnimation={showAfterAnimation}
            afterAnimationComplete={afterAnimationComplete}
            CHART_CONFIG={CHART_CONFIG}
            scales={scales}
          />

          {candlesticks.length > 0 ? (
            <>
              {candlesticks.map((candle, i) => {
                // Use the x position from geometry calculation to ensure alignment with SMAs
                const finalX = candle.x !== undefined && !isNaN(candle.x) ? candle.x : calculateMainX(i);

                return (
                <g key={`main-${i}`}>
                  <line
                    x1={finalX}
                    y1={candle.highY}
                    x2={finalX}
                    y2={candle.lowY}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                  <rect
                    x={finalX - candle.width / 2}
                    y={Math.min(candle.openY, candle.closeY)}
                    width={candle.width}
                    height={Math.max(1, Math.abs(candle.closeY - candle.openY))}
                    fill={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                </g>
              );
              })}
            </>
          ) : (
            <text x="10" y="50" fill="white" fontSize="12">
              No candlesticks to render ({stockData.length} data points available)
            </text>
          )}

          {((chartType === "previous") || (scales.isZoomedOut && showAfterAnimation)) &&
            afterCandlesticks.map((candle, i) => {
              // Use the x position from geometry calculation to ensure alignment with SMAs
              const finalX = candle.x !== undefined && !isNaN(candle.x) ? candle.x : calculateAfterX(stockData.length + i);

              return (
              <g key={`after-${i}`}>
                {!isNaN(finalX) && !isNaN(candle.highY) && !isNaN(candle.lowY) && (
                  <line
                    x1={finalX}
                    y1={candle.highY}
                    x2={finalX}
                    y2={candle.lowY}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                )}
                {!isNaN(finalX) && !isNaN(candle.openY) && !isNaN(candle.closeY) && (
                  <rect
                    x={finalX - candle.width / 2}
                    y={Math.min(candle.openY, candle.closeY)}
                    width={candle.width}
                    height={Math.abs(candle.closeY - candle.openY)}
                    fill={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
            })}

          {userSelection && (() => {
            const lastDataIndex = stockData.length - 1;
            const isFutureSelection = userSelection.x > lastDataIndex;
            if (!isFutureSelection) return null;

            const lastDataXPos = scales.xScale(lastDataIndex);
            if (lastDataXPos === undefined) return null;
            const step = scales.xScale.step();
            const stepsBeyond = userSelection.x - lastDataIndex - 1;
            const futureXPos = lastDataXPos + (stepsBeyond + 1) * step;
            const yPos = scales.priceScale(userSelection.y) + dimensions.margin.top;

            return (
              <g>
                <circle
                  cx={futureXPos + dimensions.margin.left}
                  cy={yPos}
                  r={4}
                  fill="#FFD700"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  opacity={0.95}
                />
              </g>
            );
          })()}

          {targetPoint && userSelection && (() => {
            const lastDataIndex = stockData.length - 1;
            const isUserSelectionFuture = userSelection.x > lastDataIndex;
            const isTargetFuture = targetPoint.x > lastDataIndex;

            if (!isUserSelectionFuture || !isTargetFuture) return null;

            const lastDataXPos = scales.xScale(lastDataIndex);
            if (lastDataXPos === undefined) return null;
            const step = scales.xScale.step();

            const userStepsBeyond = userSelection.x - lastDataIndex - 1;
            const userFutureXPos = lastDataXPos + (userStepsBeyond + 1) * step;

            const targetStepsBeyond = targetPoint.x - lastDataIndex - 1;
            const targetFutureXPos = lastDataXPos + (targetStepsBeyond + 1) * step;
            const targetYPos = scales.priceScale(targetPoint.y) + dimensions.margin.top;

            return (
              <g>
                <circle
                  cx={targetFutureXPos + dimensions.margin.left}
                  cy={targetYPos}
                  r={4}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  opacity={0.95}
                />
                <line
                  x1={userFutureXPos + dimensions.margin.left}
                  y1={scales.priceScale(userSelection.y) + dimensions.margin.top}
                  x2={targetFutureXPos + dimensions.margin.left}
                  y2={targetYPos}
                  stroke="#666666"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.4}
                />
              </g>
            );
          })()}

          {shouldShowDividerAndBackground && (() => {
            // Semi-transparent overlay on right side
            const relativeDividerX = dividerLineX - dimensions.margin.left;
            return (
              <rect
                x={relativeDividerX}
                y={0}
                width={dimensions.innerWidth - relativeDividerX}
                height={dimensions.innerHeight}
                fill="rgba(255, 255, 255, 0.02)"
                pointerEvents="none"
              />
            );
          })()}
          
          {/* Note: Gray dotted line is rendered in ChartSvg.tsx at top level to avoid clipping */}
        </g>
      </g>
    </>
  );
};

export default PriceChart;

