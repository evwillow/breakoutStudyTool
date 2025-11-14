import React from "react";
import type { Line } from "d3-shape";
import ChartAxis from "./ChartAxis";
import PriceChart from "./PriceChart";
import VolumeChart from "./VolumeChart";
import type {
  ChartConfig,
  ChartCoordinate,
  ChartScales,
  ChartType,
  ChartClickHandler,
  ChartDimensions,
  ProcessedStockDataPoint,
  CandlestickData,
  VolumeBarData
} from "../StockChart.types";

interface ChartLayersProps {
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
  volumeBars: VolumeBarData[];
  afterVolumeBars: VolumeBarData[];
}

const ChartLayers: React.FC<ChartLayersProps> = props => {
  const {
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
    afterStockDataLength,
    volumeBars,
    afterVolumeBars
  } = props;

  return (
    <g clipPath={`url(#chart-clip-${chartType})`}>
      <ChartAxis chartType={chartType} scales={scales} dimensions={dimensions} />
      <PriceChart
        chartType={chartType}
        isMobile={isMobile}
        dimensions={dimensions}
        scales={scales}
        stockData={stockData}
        visibleAfterData={visibleAfterData}
        candlesticks={candlesticks}
        afterCandlesticks={afterCandlesticks}
        hasSMA10={hasSMA10}
        hasSMA20={hasSMA20}
        hasSMA50={hasSMA50}
        sma10Line={sma10Line}
        sma20Line={sma20Line}
        sma50Line={sma50Line}
        afterSma10Line={afterSma10Line}
        afterSma20Line={afterSma20Line}
        afterSma50Line={afterSma50Line}
        showSMA={showSMA}
        forceShowSMA={forceShowSMA}
        CHART_CONFIG={CHART_CONFIG}
        showAfterAnimation={showAfterAnimation}
        afterAnimationComplete={afterAnimationComplete}
        userSelection={userSelection}
        targetPoint={targetPoint}
        onChartClick={onChartClick}
        disabled={disabled}
        backgroundColor={backgroundColor}
        shouldShowDividerAndBackground={shouldShowDividerAndBackground}
        dividerLineX={dividerLineX}
        darkBackgroundWidth={darkBackgroundWidth}
        progressiveMaskWidth={progressiveMaskWidth}
        afterStockDataLength={afterStockDataLength}
      />
      <VolumeChart
        chartType={chartType}
        scales={scales}
        volumeBars={volumeBars}
        afterVolumeBars={afterVolumeBars}
        showAfterAnimation={showAfterAnimation}
        CHART_CONFIG={CHART_CONFIG}
        backgroundColor={backgroundColor}
      />
    </g>
  );
};

export default ChartLayers;

