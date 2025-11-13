"use client";
import React, { useMemo, useRef } from "react";
import {
  ChartType,
  ProcessedStockDataPoint,
  ChartCoordinate,
  ChartClickHandler,
  StockChartProps,
  DragStartPos,
  ContainerRef
} from './StockChart.types';
import { getChartConfig } from "./config";
import { useChartData } from "./hooks/useChartData";
import { useChartScale } from "./hooks/useChartScale";
import { useChartInteraction } from "./hooks/useChartInteraction";
import { useChartDimensions } from "./hooks/useChartDimensions";
import { useChartGeometry } from "./hooks/useChartGeometry";
import ChartSvg from "./components/ChartSvg";
import ChartLayers from "./components/ChartLayers";


/**
 * StockChart component renders price and volume data with optional moving averages
 */
const StockChart = React.memo<StockChartProps>(({ 
  data,
  csvData,
  afterData = null,
  showSMA = true, 
  includeAuth = false, 
  chartType = 'default', 
  height = null,
  backgroundColor = null,
  showAfterAnimation = false,
  progressPercentage = 100,
  zoomPercentage = 100,
  isInDelayPhase = false,
  afterAnimationComplete = false,
  forceShowSMA = false,
  tightPadding = false,
  onChartClick = null,
  userSelection = null,
  targetPoint = null,
  disabled = false,
  timerRightEdge = null,
  timerLeftEdge = null,
  dLabelRightEdge = null,
  dLabelCenterY = null
}) => {
  const containerRef = useRef<ContainerRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handleChartClickRef = useRef<ChartClickHandler | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<DragStartPos>({ x: 0, y: 0 });
  const isInSelectableAreaRef = useRef<boolean>(false);
  
  const chartData = data || csvData;
  const shouldRenderSMA = showSMA || forceShowSMA;
  
  const { dimensions, isMobile } = useChartDimensions({ containerRef, tightPadding });
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!chartData) {
    // Return empty div to maintain layout - parent will handle loading state
    return <div ref={containerRef} className="w-full h-full min-h-[400px] bg-black transition-opacity duration-500 ease-in-out" />;
  }

  const {
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    shouldShowBackground
  } = useChartData({
    chartData,
    afterData,
    chartType,
    progressPercentage
  });

  // Calculate scales with zoom out for combined data view
  // Create line generators for SMA
  // Create line generators for SMA20 and SMA50 (similar to SMA10)
  // Create SMA line generators for after data
  const {
    scales,
    sma10Line,
    sma20Line,
    sma50Line,
    afterSma10Line,
    afterSma20Line,
    afterSma50Line
  } = useChartScale({
    dimensions,
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    zoomPercentage,
    isMobile,
    chartType,
    tightPadding,
    onChartClick,
    shouldRenderSMA
  });

  const {
    candlesticks,
    afterCandlesticks,
    volumeBars,
    afterVolumeBars
  } = useChartGeometry({
    scales,
    stockData,
    afterStockData,
    visibleAfterData,
    dimensions,
    zoomPercentage,
    showAfterAnimation,
    chartType
  });

  const {
    handleChartClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useChartInteraction({
    containerRef,
    svgRef,
    handleChartClickRef,
    isDraggingRef,
    dragStartPosRef,
    isInSelectableAreaRef,
    scales,
    dimensions,
    stockData,
    isMobile,
    onChartClick,
    disabled
  });

  // Early return check AFTER all hooks
  if (!dimensions || !scales || !stockData.length) {
    // Return empty div to maintain layout - parent will handle loading state
    return <div ref={containerRef} className="w-full h-full min-h-[400px] bg-black" />;
  }

  const shouldShowDividerAndBackground = (zoomPercentage > 0 && afterStockData.length > 0) || shouldShowBackground;
  
  // Calculate divider line position - FIXED POSITION on screen (always same position)
  // Use a fixed percentage of container width to ensure divider stays in same screen position
  // This matches the dashed separator line position for consistency
  let dividerLineX: number;
  let darkBackgroundWidth: number;
  
  const DIVIDER_POSITION_PERCENT = isMobile ? 0.70 : 0.75; // Mobile: 70%, Desktop: 75%
  
  if (scales && dimensions && stockData.length > 0 && afterStockData.length > 0) {
    dividerLineX = dimensions.margin.left + (dimensions.innerWidth * DIVIDER_POSITION_PERCENT);
    
    darkBackgroundWidth = dimensions.width - dividerLineX;
  } else {
    dividerLineX = 0;
    darkBackgroundWidth = 0;
  }
  
  const getProgressiveMaskWidth = (): number => {
    if (!showAfterAnimation || progressPercentage >= 100) return 0;
    
    const fullWidth = darkBackgroundWidth;
    const visibleWidth = (progressPercentage / 100) * fullWidth;
    return fullWidth - visibleWidth;
  };

  const progressiveMaskWidth = getProgressiveMaskWidth();

  const layers = (
    <ChartLayers
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
      afterStockDataLength={afterStockData.length}
      volumeBars={volumeBars}
      afterVolumeBars={afterVolumeBars}
    />
  );

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full stock-chart-container"
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: chartType === 'hourly' ? '0' : '400px' }}
    >
      <ChartSvg
        chartType={chartType}
        isMobile={isMobile}
        tightPadding={tightPadding}
        backgroundColor={backgroundColor}
        dimensions={dimensions}
        svgRef={svgRef}
        onChartClick={onChartClick}
        disabled={disabled}
        handleChartClick={handleChartClick}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        isDraggingRef={isDraggingRef}
        isInSelectableAreaRef={isInSelectableAreaRef}
        shouldShowDividerAndBackground={shouldShowDividerAndBackground}
        dividerLineX={dividerLineX}
        darkBackgroundWidth={darkBackgroundWidth}
        progressiveMaskWidth={progressiveMaskWidth}
        layers={layers}
      />
    </div>
  );

}, (prevProps: StockChartProps, nextProps: StockChartProps): boolean => {
  // Custom comparison function for memoization to prevent unnecessary rerenders
  return (
    prevProps.data === nextProps.data &&
    prevProps.csvData === nextProps.csvData &&
    prevProps.afterData === nextProps.afterData &&
    prevProps.showSMA === nextProps.showSMA &&
    prevProps.includeAuth === nextProps.includeAuth &&
    prevProps.chartType === nextProps.chartType &&
    prevProps.height === nextProps.height &&
    prevProps.backgroundColor === nextProps.backgroundColor &&
    prevProps.showAfterAnimation === nextProps.showAfterAnimation &&
    prevProps.progressPercentage === nextProps.progressPercentage &&
    prevProps.zoomPercentage === nextProps.zoomPercentage &&
    prevProps.isInDelayPhase === nextProps.isInDelayPhase &&
    prevProps.afterAnimationComplete === nextProps.afterAnimationComplete &&
    prevProps.forceShowSMA === nextProps.forceShowSMA &&
    prevProps.tightPadding === nextProps.tightPadding
  );
});

export default StockChart;

export { getChartConfig } from "./config";
export { calculateSMA, processChartData } from "@/services/chart/technicalIndicators";


