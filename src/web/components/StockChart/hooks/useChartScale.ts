import { useMemo } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import { line, type Line } from "d3-shape";
import type {
  ChartClickHandler,
  ChartDimensions,
  ChartScales,
  ChartType,
  ProcessedStockDataPoint
} from "../StockChart.types";

interface UseChartScaleParams {
  dimensions: ChartDimensions | null;
  stockData: ProcessedStockDataPoint[];
  afterStockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  hasSMA10: boolean;
  hasSMA20: boolean;
  hasSMA50: boolean;
  zoomPercentage: number;
  isMobile: boolean;
  chartType: ChartType;
  tightPadding: boolean;
  onChartClick: ChartClickHandler | null;
  shouldRenderSMA: boolean;
}

interface UseChartScaleResult {
  scales: ChartScales | null;
  sma10Line: Line<ProcessedStockDataPoint> | null;
  sma20Line: Line<ProcessedStockDataPoint> | null;
  sma50Line: Line<ProcessedStockDataPoint> | null;
  afterSma10Line: Line<ProcessedStockDataPoint> | null;
  afterSma20Line: Line<ProcessedStockDataPoint> | null;
  afterSma50Line: Line<ProcessedStockDataPoint> | null;
}

export const useChartScale = ({
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
}: UseChartScaleParams): UseChartScaleResult => {
  const scales = useMemo<ChartScales | null>(() => {
    if (!dimensions || !stockData.length) return null;

    if (chartType === "hourly") {
      console.log("First data point for hourly with SMAs:", stockData[0]);
    }

    const mainValues = stockData.flatMap(d => {
      const values: (number | null | undefined)[] = [
        d.high as number | undefined,
        d.low as number | undefined,
        d.close as number | undefined,
        d.open as number | undefined
      ];

      if (hasSMA10 && d.sma10 !== null && !isNaN(Number(d.sma10))) values.push(d.sma10 as number);
      if (hasSMA20 && d.sma20 !== null && !isNaN(Number(d.sma20))) values.push(d.sma20 as number);
      if (hasSMA50 && d.sma50 !== null && !isNaN(Number(d.sma50))) values.push(d.sma50 as number);

      return values.filter(
        (v): v is number =>
          v !== null && v !== undefined && !isNaN(v) && v > 0.001
      );
    });

    if (mainValues.length === 0) {
      console.warn("No valid price values found in data");
      return null;
    }

    const mainMin = Math.min(...mainValues);
    const mainMax = Math.max(...mainValues);

    const isDChart = chartType === "default" || chartType === "D";
    const isPreviousChart = chartType === "previous";
    let afterMin = mainMin;
    let afterMax = mainMax;

    // For previous charts and non-D charts, include after data in min/max calculation
    if (afterStockData.length > 0 && (isPreviousChart || !isDChart)) {
      const afterValues = afterStockData.flatMap(d => {
        const values: (number | null | undefined)[] = [
          d.high as number | undefined,
          d.low as number | undefined,
          d.close as number | undefined,
          d.open as number | undefined
        ];

        if (hasSMA10 && d.sma10 !== null && !isNaN(Number(d.sma10))) values.push(d.sma10 as number);
        if (hasSMA20 && d.sma20 !== null && !isNaN(Number(d.sma20))) values.push(d.sma20 as number);
        if (hasSMA50 && d.sma50 !== null && !isNaN(Number(d.sma50))) values.push(d.sma50 as number);

        return values.filter(
          (v): v is number =>
            v !== null && v !== undefined && !isNaN(v) && v > 0.001
        );
      });

      if (afterValues.length > 0) {
        afterMin = Math.min(...afterValues);
        afterMax = Math.max(...afterValues);
      }
    }

    let combinedMin: number;
    let combinedMax: number;

    if (isDChart) {
      // For D charts, use padding logic
      const mainRange = mainMax - mainMin;
      const paddingAbove = mainRange * 0.5;
      const paddingBelow = mainRange * 0.1;
      combinedMin = mainMin - paddingBelow;
      combinedMax = mainMax + paddingAbove;
    } else if (isPreviousChart) {
      // For previous charts, use exact min/max with no padding to fill vertical space
      combinedMin = Math.min(mainMin, afterMin);
      combinedMax = Math.max(mainMax, afterMax);
    } else {
      combinedMin = Math.min(mainMin, afterMin);
      combinedMax = Math.max(mainMax, afterMax);
    }

    let currentMin: number;
    let currentMax: number;
    let totalDataPoints: number;
    let combinedIndices: number[];
    const hasAfterData = afterStockData.length > 0;

    if (hasAfterData && !isDChart) {
      totalDataPoints = stockData.length + afterStockData.length;
      combinedIndices = Array.from(Array(totalDataPoints).keys());

      const zoomFactor = zoomPercentage / 100;
      const minRange = mainMin;
      const maxRange = mainMax;
      const minCombined = combinedMin;
      const maxCombined = combinedMax;

      currentMin = minRange + (minCombined - minRange) * zoomFactor;
      currentMax = maxRange + (maxCombined - maxRange) * zoomFactor;
    } else if (isDChart || chartType === "previous") {
      // For previous charts, include both stockData and afterStockData in the scale
      currentMin = combinedMin;
      currentMax = combinedMax;
      totalDataPoints = hasAfterData ? stockData.length + afterStockData.length : stockData.length;
      combinedIndices = Array.from(Array(totalDataPoints).keys());
    } else {
      currentMin = mainMin;
      currentMax = mainMax;
      totalDataPoints = stockData.length;
      combinedIndices = Array.from(Array(stockData.length).keys());
    }

    const priceRange = currentMax - currentMin;
    // For previous charts, use asymmetric padding: significantly more on bottom to prevent overflow
    // Top padding: 1%, Bottom padding: 12% to ensure low wicks, SMAs, and any edge cases stay within borders
    // This aggressive bottom padding ensures nothing goes off the bottom edge
    const topPadding = chartType === "previous" ? priceRange * 0.01 : priceRange * 0.2;
    const bottomPadding = chartType === "previous" ? priceRange * 0.12 : priceRange * 0.2;
    const pricePadding = topPadding; // Keep for backward compatibility, but we'll use both

    const volumeValues = stockData
      .map(d => {
        const vol = (d.volume || d.Volume || d.VOLUME) as number | undefined;
        return vol !== undefined && vol !== null && !isNaN(vol) ? parseFloat(String(vol)) : 0;
      })
      .filter(v => v > 0);

    const volumeMax = volumeValues.length > 0 ? Math.max(...volumeValues) : 1;
    const volumePadding = chartType === "previous" ? 0 : volumeMax * 0.1;

    const totalHeight = dimensions.innerHeight;
    let volumePercentage: number;
    let volumeHeight: number;
    let priceHeight: number;
    if (chartType === "previous") {
      volumePercentage = 0;
      volumeHeight = 0;
      priceHeight = totalHeight;
    } else {
      volumePercentage = isMobile ? 0.25 : 0.2;
      volumeHeight = totalHeight * volumePercentage;
      priceHeight = totalHeight - volumeHeight;
    }

    const lastValidDataPoint = stockData[stockData.length - 1];
    const lastPrice = (lastValidDataPoint?.close || lastValidDataPoint?.Close) as number | undefined;

    const extendedIndices = [...combinedIndices];
    if (onChartClick) {
      if (isMobile) {
        const extensionCount = Math.max(15, Math.floor(combinedIndices.length * 0.3));
        for (let i = 0; i < extensionCount; i++) {
          extendedIndices.push(combinedIndices[combinedIndices.length - 1] + i + 1);
        }
      } else {
        const extensionCount = Math.floor(combinedIndices.length * 0.5);
        for (let i = 0; i < extensionCount; i++) {
          extendedIndices.push(combinedIndices[combinedIndices.length - 1] + i + 1);
        }
      }
    }

    // Use minimal padding to ensure data starts at left edge and ends at divider
    // For D charts, use zero padding to ensure first candle and SMAs touch the left edge
    const xScalePadding = tightPadding ? 0 : (isDChart ? 0 : (isMobile ? 0.01 : 0.02));
    const DIVIDER_POSITION_PERCENT = isMobile ? 0.7 : 0.75;
    const dividerPositionInChart = dimensions.innerWidth * DIVIDER_POSITION_PERCENT;

    // For previous charts, use same logic as D chart but with a small right margin for readability
    // Leave ~2-3% of container width as margin on the right for readability
    const rightMarginPercent = chartType === "previous" ? 0.025 : 0; // 2.5% margin
    const effectiveContainerWidth = dimensions.innerWidth * (1 - rightMarginPercent);
    
    let xScaleRangeMultiplier = isMobile ? 1.05 : 1.2;
    let xScaleRangeEnd = effectiveContainerWidth * xScaleRangeMultiplier;

    // For previous charts, ensure data fills the space tightly with a small margin
    if (chartType === "previous" && stockData.length > 0) {
      const totalDataPoints = hasAfterData ? stockData.length + afterStockData.length : stockData.length;
      const dataIndices = Array.from(Array(totalDataPoints).keys());
      const lastDataIndex = totalDataPoints - 1;
      
      // Target: last point's right edge should be at 98% of effective width (leaving 2% margin for readability)
      const targetRightEdgePercent = 0.98; // 98% of effective width
      const targetRightEdge = effectiveContainerWidth * targetRightEdgePercent;
      
      // Start with a good approximation
      const n = totalDataPoints;
      let finalRange = n > 1 ? effectiveContainerWidth / (1 + 0.1 / (n - 1)) : effectiveContainerWidth;
      
      // Iterate to find precise range - ensure both first and last points are positioned correctly
      for (let iter = 0; iter < 100; iter++) {
        const testScale = scalePoint<number>()
          .domain(dataIndices)
          .range([0, finalRange])
          .padding(xScalePadding);
        
        const firstCenterX = testScale(0);
        const lastCenterX = testScale(lastDataIndex);
        if (lastCenterX === undefined || isNaN(lastCenterX) || firstCenterX === undefined || isNaN(firstCenterX)) {
          break;
        }
        
        const step = testScale.step();
        const firstLeftEdge = firstCenterX - (step * 0.4);
        const lastRightEdge = lastCenterX + (step * 0.4);
        
        // Check both constraints: first point at 0, last point at target
        const firstDifference = Math.abs(firstLeftEdge - 0);
        const lastDifference = targetRightEdge - lastRightEdge;
        
        // If both are within tolerance, we're done
        if (firstDifference < 0.01 && Math.abs(lastDifference) < 0.1) {
          break;
        }
        
        // Adjust based on which constraint is further off
        if (lastRightEdge < targetRightEdge) {
          // Need to expand to reach target
          const expansionRatio = targetRightEdge / lastRightEdge;
          finalRange = finalRange * expansionRatio;
        } else if (lastRightEdge > targetRightEdge) {
          // Overshot - shrink
          const shrinkRatio = targetRightEdge / lastRightEdge;
          finalRange = finalRange * shrinkRatio;
        }
        
        // Safety check
        if (!isFinite(finalRange) || finalRange <= 0 || finalRange > effectiveContainerWidth * 3) {
          finalRange = effectiveContainerWidth;
          break;
        }
      }
      
      // Final verification - ensure we're very close to target
      const verifyScale = scalePoint<number>()
        .domain(dataIndices)
        .range([0, finalRange])
        .padding(xScalePadding);
      const verifyFirstCenterX = verifyScale(0);
      const verifyLastCenterX = verifyScale(lastDataIndex);
      if (verifyLastCenterX !== undefined && !isNaN(verifyLastCenterX) && verifyFirstCenterX !== undefined && !isNaN(verifyFirstCenterX)) {
        const verifyStep = verifyScale.step();
        const verifyLastRightEdge = verifyLastCenterX + (verifyStep * 0.4);
        if (verifyLastRightEdge < targetRightEdge) {
          // One final expansion to get as close as possible
          const finalExpansion = targetRightEdge / verifyLastRightEdge;
          finalRange = finalRange * finalExpansion;
        }
      }

      xScaleRangeEnd = finalRange;
    }

    // For D charts and non-previous charts, ensure data starts at left edge and ends at divider
    if ((isDChart || chartType !== "previous") && stockData.length > 0) {
      const numMainDataPoints = stockData.length;
      const lastMainDataIndex = numMainDataPoints - 1;
      const mainDataIndices = Array.from(Array(numMainDataPoints).keys());
      const hasAfterDataForDChart = isDChart && hasAfterData;

      // For D charts, estimate candlestick width to position first candlestick at left edge
      // We'll refine this in the iteration loop
      const estimatedStep = dividerPositionInChart / Math.max(numMainDataPoints, 1);
      const estimatedCandlestickHalfWidth = estimatedStep * 0.4;
      
      // Start with range that accounts for candlestick width offset for D charts
      let currentRange = isDChart 
        ? dividerPositionInChart * 1.15 + estimatedCandlestickHalfWidth
        : dividerPositionInChart * 1.15;
      let iterations = 0;
      const maxIterations = 50;
      let bestRange = currentRange;
      let bestDifference = Infinity;

      while (iterations < maxIterations) {
        // For D charts with after data, use combined indices to ensure continuity
        const testDomain = hasAfterDataForDChart ? combinedIndices : mainDataIndices;
        const testScale = scalePoint<number>()
          .domain(testDomain)
          .range([0, currentRange])
          .padding(xScalePadding);

        const firstCenterX = testScale(0);
        const lastCenterX = testScale(lastMainDataIndex);
        if (lastCenterX === undefined || isNaN(lastCenterX) || firstCenterX === undefined || isNaN(firstCenterX)) {
          currentRange = bestRange;
          break;
        }

        const step = testScale.step();
        const firstLeftEdge = firstCenterX - step * 0.4;
        const lastRightEdge = lastCenterX + step * 0.4;
        
        // For D charts, ensure first candlestick's left edge is at 0 for continuous appearance
        // Candlestick width is step * 0.8, so left edge = center - width/2 = center - step * 0.4
        // We want left edge at 0, so center should be at step * 0.4
        const candlestickHalfWidth = step * 0.4;
        const firstCandlestickLeftEdge = firstCenterX - candlestickHalfWidth;
        
        // For D charts, check that first candlestick left edge is at 0 (for continuous flow from left)
        // Check both: first candlestick left edge should be at 0, last point should end at divider
        // Note: We'll offset the range later, so we need to account for that in the calculation
        const firstDifference = isDChart ? Math.abs(firstCandlestickLeftEdge - 0) : Math.abs(firstLeftEdge - 0);
        // For D charts, account for the range offset we'll apply (candlestickHalfWidth)
        // The last point's right edge should be at dividerPositionInChart
        // But since we'll offset range by candlestickHalfWidth, we need to adjust
        const effectiveDividerPosition = isDChart 
          ? dividerPositionInChart - candlestickHalfWidth 
          : dividerPositionInChart;
        const lastDifference = Math.abs(lastRightEdge - effectiveDividerPosition);
        const totalDifference = firstDifference + lastDifference;

        // For D charts with after data, also check that after data starts at divider
        let afterStartDifference = 0;
        if (hasAfterDataForDChart && combinedIndices.length > numMainDataPoints) {
          const firstAfterIndex = numMainDataPoints;
          const firstAfterCenterX = testScale(firstAfterIndex);
          if (firstAfterCenterX !== undefined && !isNaN(firstAfterCenterX)) {
            const firstAfterLeftEdge = firstAfterCenterX - step * 0.4;
            afterStartDifference = Math.abs(firstAfterLeftEdge - dividerPositionInChart);
            // Add to total difference to ensure continuity
            const adjustedTotalDifference = totalDifference + afterStartDifference;
            if (adjustedTotalDifference < bestDifference) {
              bestDifference = adjustedTotalDifference;
              bestRange = currentRange;
            }
          }
        } else {
          if (totalDifference < bestDifference) {
            bestDifference = totalDifference;
            bestRange = currentRange;
          }
        }

        if (lastDifference < 0.01 && firstDifference < 0.01 && afterStartDifference < 0.01) {
          xScaleRangeEnd = currentRange;
          break;
        }

        // Adjust based on constraints
        const lastAdjustment = effectiveDividerPosition / lastRightEdge;
        // For D charts, adjust based on candlestick left edge to ensure continuous flow from left
        // If first candlestick left edge > 0, we need to shift/adjust the range
        const firstAdjustment = isDChart 
          ? (firstCandlestickLeftEdge > 0.01 
              ? (currentRange - firstCandlestickLeftEdge) / currentRange 
              : (firstCandlestickLeftEdge < -0.01 
                  ? currentRange / (currentRange - firstCandlestickLeftEdge) 
                  : 1.0))
          : (firstLeftEdge > 0 ? (dividerPositionInChart - firstLeftEdge) / dividerPositionInChart : 1.0);
        
        // For D charts with after data, also adjust based on after data position
        let afterAdjustment = 1.0;
        if (hasAfterDataForDChart && combinedIndices.length > numMainDataPoints) {
          const firstAfterIndex = numMainDataPoints;
          const firstAfterCenterX = testScale(firstAfterIndex);
          if (firstAfterCenterX !== undefined && !isNaN(firstAfterCenterX)) {
            const firstAfterLeftEdge = firstAfterCenterX - step * 0.4;
            if (firstAfterLeftEdge < dividerPositionInChart) {
              // After data starts too early, need to expand range
              afterAdjustment = dividerPositionInChart / firstAfterLeftEdge;
            } else if (firstAfterLeftEdge > dividerPositionInChart) {
              // After data starts too late, need to shrink range
              afterAdjustment = dividerPositionInChart / firstAfterLeftEdge;
            }
          }
        }
        
        const combinedAdjustment = hasAfterDataForDChart 
          ? (lastAdjustment + firstAdjustment + afterAdjustment) / 3
          : (lastAdjustment + firstAdjustment) / 2;
        const newRange = currentRange * combinedAdjustment;

        if (newRange <= 0 || newRange > dimensions.innerWidth * 5 || !isFinite(newRange)) {
          currentRange = bestRange;
          break;
        }

        currentRange = newRange;
        iterations++;
      }

      if (extendedIndices.length > mainDataIndices.length) {
        let extendedRange = bestRange;
        let extendedIterations = 0;
        const maxExtendedIterations = 30;

        while (extendedIterations < maxExtendedIterations) {
          const verifyDomain = hasAfterDataForDChart ? extendedIndices : extendedIndices;
          const verifyScale = scalePoint<number>()
            .domain(verifyDomain)
            .range([0, extendedRange])
            .padding(xScalePadding);

          const verifyFirstX = verifyScale(0);
          const verifyLastX = verifyScale(lastMainDataIndex);
          if (verifyLastX === undefined || isNaN(verifyLastX) || verifyFirstX === undefined || isNaN(verifyFirstX)) {
            break;
          }

          const verifyStep = verifyScale.step();
          const verifyFirstLeftEdge = verifyFirstX - verifyStep * 0.4;
          const verifyRightEdge = verifyLastX + verifyStep * 0.4;
          // For D charts, ensure first candlestick left edge is at 0 (for continuous flow from left)
          const verifyCandlestickHalfWidth = verifyStep * 0.4;
          const verifyFirstCandlestickLeftEdge = verifyFirstX - verifyCandlestickHalfWidth;
          const verifyFirstDiff = isDChart ? Math.abs(verifyFirstCandlestickLeftEdge - 0) : Math.abs(verifyFirstLeftEdge - 0);
          const verifyEffectiveDividerPosition = isDChart 
            ? dividerPositionInChart - verifyCandlestickHalfWidth 
            : dividerPositionInChart;
          const verifyLastDiff = Math.abs(verifyRightEdge - verifyEffectiveDividerPosition);

          // Check after data position for D charts
          let verifyAfterDiff = 0;
          if (hasAfterDataForDChart && extendedIndices.length > numMainDataPoints) {
            const firstAfterIndex = numMainDataPoints;
            const verifyFirstAfterX = verifyScale(firstAfterIndex);
            if (verifyFirstAfterX !== undefined && !isNaN(verifyFirstAfterX)) {
              const verifyFirstAfterLeftEdge = verifyFirstAfterX - verifyStep * 0.4;
              verifyAfterDiff = Math.abs(verifyFirstAfterLeftEdge - dividerPositionInChart);
            }
          }

          if (verifyLastDiff < 0.01 && verifyFirstDiff < 0.01 && verifyAfterDiff < 0.01) {
            bestRange = extendedRange;
            break;
          }

          const verifyLastAdjustment = verifyEffectiveDividerPosition / verifyRightEdge;
          // For D charts, adjust based on candlestick left edge to ensure continuous flow from left
          const verifyFirstAdjustment = isDChart
            ? (verifyFirstCandlestickLeftEdge > 0.01 
                ? (extendedRange - verifyFirstCandlestickLeftEdge) / extendedRange 
                : (verifyFirstCandlestickLeftEdge < -0.01 
                    ? extendedRange / (extendedRange - verifyFirstCandlestickLeftEdge) 
                    : 1.0))
            : (verifyFirstLeftEdge > 0 ? (dividerPositionInChart - verifyFirstLeftEdge) / dividerPositionInChart : 1.0);
          
          let verifyAfterAdjustment = 1.0;
          if (hasAfterDataForDChart && extendedIndices.length > numMainDataPoints) {
            const firstAfterIndex = numMainDataPoints;
            const verifyFirstAfterX = verifyScale(firstAfterIndex);
            if (verifyFirstAfterX !== undefined && !isNaN(verifyFirstAfterX)) {
              const verifyFirstAfterLeftEdge = verifyFirstAfterX - verifyStep * 0.4;
              verifyAfterAdjustment = dividerPositionInChart / verifyFirstAfterLeftEdge;
            }
          }
          
          const verifyCombinedAdjustment = hasAfterDataForDChart
            ? (verifyLastAdjustment + verifyFirstAdjustment + verifyAfterAdjustment) / 3
            : (verifyLastAdjustment + verifyFirstAdjustment) / 2;
          extendedRange = extendedRange * verifyCombinedAdjustment;

          if (extendedRange <= 0 || extendedRange > dimensions.innerWidth * 5 || !isFinite(extendedRange)) {
            break;
          }

          extendedIterations++;
        }

        bestRange = extendedRange;
      }

      xScaleRangeEnd = bestRange;
    }

    // Calculate the final domain with padding
    const finalMin = currentMin - (chartType === "previous" ? bottomPadding : pricePadding);
    const finalMax = currentMax + (chartType === "previous" ? topPadding : pricePadding);
    
    // Safety check: ensure domain is valid and min < max
    const safeMin = isFinite(finalMin) && !isNaN(finalMin) ? finalMin : currentMin;
    const safeMax = isFinite(finalMax) && !isNaN(finalMax) ? finalMax : currentMax;
    const safeDomainMin = safeMin < safeMax ? safeMin : currentMin;
    const safeDomainMax = safeMax > safeMin ? safeMax : currentMax;

    // For D charts, ensure first candlestick's left edge and first SMA point are at 0
    // With padding 0, first point's center will be at 0, so left edge will be at -candlestickHalfWidth
    // To fix this, we offset the range so first point center is at candlestickHalfWidth, making left edge at 0
    const rangeStart = isDChart && xScaleRangeEnd > 0 ? (() => {
      // Calculate actual step size from the range
      const estimatedStep = xScaleRangeEnd / Math.max(extendedIndices.length - 1, 1);
      const candlestickHalfWidth = estimatedStep * 0.4;
      // Range start should be candlestickHalfWidth so first point center is there, left edge at 0
      return candlestickHalfWidth;
    })() : 0;
    // For D charts, adjust rangeEnd to account for the offset
    // The positioning logic calculated xScaleRangeEnd for the effective divider position
    // We need to add the offset to maintain correct positioning
    const rangeEnd = xScaleRangeEnd + rangeStart;

    return {
      priceScale: scaleLinear<number, number>()
        .domain([safeDomainMin, safeDomainMax])
        .range([priceHeight, 0]),
      volumeScale: scaleLinear<number, number>()
        .domain([0, volumeMax + volumePadding])
        .range([volumeHeight, 0]),
      xScale: scalePoint<number>()
        .domain(extendedIndices)
        .range([rangeStart, rangeEnd])
        .padding(xScalePadding),
      priceHeight,
      volumeHeight,
      useFullDomain: zoomPercentage > 0,
      lastPrice,
      isZoomedOut: zoomPercentage > 0,
      extendedDomain: extendedIndices.length > combinedIndices.length
    };
  }, [
    dimensions,
    stockData,
    afterStockData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    visibleAfterData,
    zoomPercentage,
    isMobile,
    chartType,
    tightPadding,
    onChartClick
  ]);

  const sma10Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!shouldRenderSMA) return null;
    if (!scales || !stockData.length) return null;

    if (chartType === "hourly" || chartType === "H") {
      console.log("Attempting to create SMA10 line for hourly chart");
      console.log(
        "SMA10 availability check:",
        stockData.filter(
          d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10))
        ).length,
        "out of",
        stockData.length
      );
    }

    const validSMA10Points = stockData.filter(
      d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10))
    );

    if (validSMA10Points.length === 0) {
      if (shouldRenderSMA) {
        console.warn("No valid SMA10 points to render");
      }
      return null;
    }

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        // Find the original index in stockData to get correct x position
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        const xPos = isInDomain ? scales.xScale(indexToUse) : undefined;
        if (xPos === undefined) return NaN;
        return xPos;
      })
      .y(d => {
        if (d.sma10 === null || d.sma10 === undefined || isNaN(Number(d.sma10))) {
          return NaN;
        }
        return scales.priceScale(d.sma10 as number);
      })
      .defined((d, i) => {
        const hasValidValue =
          d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10));
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData, shouldRenderSMA, chartType]);

  const sma20Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!shouldRenderSMA) return null;
    if (!scales || !stockData.length) return null;

    if (chartType === "hourly" || chartType === "H") {
      console.log("Attempting to create SMA20 line for hourly chart");
      console.log(
        "SMA20 availability check:",
        stockData.filter(
          d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20))
        ).length,
        "out of",
        stockData.length
      );
    }

    const validSMA20Points = stockData.filter(
      d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20))
    );

    if (validSMA20Points.length === 0) {
      if (shouldRenderSMA) {
        console.warn("No valid SMA20 points to render");
      }
      return null;
    }

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        const xPos = isInDomain ? scales.xScale(indexToUse) : undefined;
        return xPos === undefined ? NaN : xPos;
      })
      .y(d => {
        if (d.sma20 === null || d.sma20 === undefined || isNaN(Number(d.sma20))) {
          return NaN;
        }
        return scales.priceScale(d.sma20 as number);
      })
      .defined((d, i) => {
        const hasValidValue =
          d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20));
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData, shouldRenderSMA, chartType]);

  const sma50Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!shouldRenderSMA) return null;
    if (!scales || !stockData.length) return null;

    const validSMA50Points = stockData.filter(
      d => d.sma50 !== null && d.sma50 !== undefined && !isNaN(Number(d.sma50))
    );

    if (validSMA50Points.length === 0) {
      if (shouldRenderSMA) {
        console.warn("No valid SMA50 points to render");
      }
      return null;
    }

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        const xPos = isInDomain ? scales.xScale(indexToUse) : undefined;
        return xPos === undefined ? NaN : xPos;
      })
      .y(d => {
        if (d.sma50 === null || d.sma50 === undefined || isNaN(Number(d.sma50))) {
          return NaN;
        }
        return scales.priceScale(d.sma50 as number);
      })
      .defined((d, i) => {
        const hasValidValue =
          d.sma50 !== null && d.sma50 !== undefined && !isNaN(Number(d.sma50));
        const originalIndex = stockData.indexOf(d);
        const indexToUse = originalIndex >= 0 ? originalIndex : i;
        const isInDomain = scales.xScale.domain().includes(indexToUse);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData, shouldRenderSMA]);

  const afterSma10Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        const index = stockData.length + i;
        const xPos = scales.xScale(index);
        return xPos !== undefined && !isNaN(xPos) ? xPos : NaN;
      })
      .y(d => {
        if (d.sma10 === null || d.sma10 === undefined || isNaN(Number(d.sma10))) {
          return NaN;
        }
        return scales.priceScale(d.sma10 as number);
      })
      .defined((d, i) => {
        const index = stockData.length + i;
        const isInDomain = scales.xScale.domain().includes(index);
        const hasValidValue = d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10));
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  const afterSma20Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        const index = stockData.length + i;
        const xPos = scales.xScale(index);
        return xPos !== undefined && !isNaN(xPos) ? xPos : NaN;
      })
      .y(d => {
        if (d.sma20 === null || d.sma20 === undefined || isNaN(Number(d.sma20))) {
          return NaN;
        }
        return scales.priceScale(d.sma20 as number);
      })
      .defined((d, i) => {
        const index = stockData.length + i;
        const isInDomain = scales.xScale.domain().includes(index);
        const hasValidValue = d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20));
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  const afterSma50Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => {
        const index = stockData.length + i;
        const xPos = scales.xScale(index);
        return xPos !== undefined && !isNaN(xPos) ? xPos : NaN;
      })
      .y(d => {
        if (d.sma50 === null || d.sma50 === undefined || isNaN(Number(d.sma50))) {
          return NaN;
        }
        return scales.priceScale(d.sma50 as number);
      })
      .defined((d, i) => {
        const index = stockData.length + i;
        const isInDomain = scales.xScale.domain().includes(index);
        const hasValidValue = d.sma50 !== null && d.sma50 !== undefined && !isNaN(Number(d.sma50));
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  return {
    scales,
    sma10Line,
    sma20Line,
    sma50Line,
    afterSma10Line,
    afterSma20Line,
    afterSma50Line
  };
};

