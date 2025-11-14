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
        d.close as number | undefined
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
    let afterMin = mainMin;
    let afterMax = mainMax;

    if (afterStockData.length > 0 && !isDChart) {
      const afterValues = afterStockData.flatMap(d => {
        const values: (number | null | undefined)[] = [
          d.high as number | undefined,
          d.low as number | undefined,
          d.close as number | undefined
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
      const mainRange = mainMax - mainMin;
      const paddingAbove = mainRange * 0.5;
      const paddingBelow = mainRange * 0.1;
      combinedMin = mainMin - paddingBelow;
      combinedMax = mainMax + paddingAbove;
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
    } else if (isDChart) {
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
    const pricePadding = chartType === "previous" ? 0 : priceRange * 0.2;

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
    const xScalePadding = tightPadding ? 0 : isMobile ? 0.01 : 0.02;
    const DIVIDER_POSITION_PERCENT = isMobile ? 0.7 : 0.75;
    const dividerPositionInChart = dimensions.innerWidth * DIVIDER_POSITION_PERCENT;

    let xScaleRangeMultiplier = isMobile ? 1.05 : 1.2;
    if (chartType === "previous") {
      xScaleRangeMultiplier = isMobile ? 1.1 : 1.25;
    }

    let xScaleRangeEnd = dimensions.innerWidth * xScaleRangeMultiplier;

    if (chartType !== "previous" && stockData.length > 0) {
      const numMainDataPoints = stockData.length;
      const lastMainDataIndex = numMainDataPoints - 1;
      const mainDataIndices = Array.from(Array(numMainDataPoints).keys());

      let currentRange = dividerPositionInChart * 1.15;
      let iterations = 0;
      const maxIterations = 50;
      let bestRange = currentRange;
      let bestDifference = Infinity;

      while (iterations < maxIterations) {
        const testScale = scalePoint<number>()
          .domain(mainDataIndices)
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

        // Check both: first point should start at 0, last point should end at divider
        const firstDifference = Math.abs(firstLeftEdge - 0);
        const lastDifference = Math.abs(lastRightEdge - dividerPositionInChart);
        const totalDifference = firstDifference + lastDifference;

        if (totalDifference < bestDifference) {
          bestDifference = totalDifference;
          bestRange = currentRange;
        }

        if (lastDifference < 0.01 && firstDifference < 0.01) {
          xScaleRangeEnd = currentRange;
          break;
        }

        // Adjust based on both constraints
        const lastAdjustment = dividerPositionInChart / lastRightEdge;
        // If firstLeftEdge is positive, we need to reduce the range to bring it closer to 0
        // If firstLeftEdge is negative (shouldn't happen), we need to increase the range
        const firstAdjustment = firstLeftEdge > 0 ? (dividerPositionInChart - firstLeftEdge) / dividerPositionInChart : 1.0;
        const combinedAdjustment = (lastAdjustment + firstAdjustment) / 2;
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
          const verifyScale = scalePoint<number>()
            .domain(extendedIndices)
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
          const verifyFirstDiff = Math.abs(verifyFirstLeftEdge - 0);
          const verifyLastDiff = Math.abs(verifyRightEdge - dividerPositionInChart);

          if (verifyLastDiff < 0.01 && verifyFirstDiff < 0.01) {
            bestRange = extendedRange;
            break;
          }

          const verifyLastAdjustment = dividerPositionInChart / verifyRightEdge;
          const verifyFirstAdjustment = verifyFirstLeftEdge > 0 ? (dividerPositionInChart - verifyFirstLeftEdge) / dividerPositionInChart : 1.0;
          const verifyCombinedAdjustment = (verifyLastAdjustment + verifyFirstAdjustment) / 2;
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

    return {
      priceScale: scaleLinear<number, number>()
        .domain([currentMin - pricePadding, currentMax + pricePadding])
        .range([priceHeight, 0]),
      volumeScale: scaleLinear<number, number>()
        .domain([0, volumeMax + volumePadding])
        .range([volumeHeight, 0]),
      xScale: scalePoint<number>()
        .domain(extendedIndices)
        .range([0, xScaleRangeEnd])
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
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : undefined;
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
        const isInDomain = scales.xScale.domain().includes(i);
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
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : undefined;
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
        const isInDomain = scales.xScale.domain().includes(i);
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
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : undefined;
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
        const isInDomain = scales.xScale.domain().includes(i);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData, shouldRenderSMA]);

  const afterSma10Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => scales.xScale(stockData.length + i) ?? 0)
      .y(d => {
        if (d.sma10 === null || d.sma10 === undefined || isNaN(Number(d.sma10))) {
          return NaN;
        }
        return scales.priceScale(d.sma10 as number);
      })
      .defined(d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10)));
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  const afterSma20Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => scales.xScale(stockData.length + i) ?? 0)
      .y(d => {
        if (d.sma20 === null || d.sma20 === undefined || isNaN(Number(d.sma20))) {
          return NaN;
        }
        return scales.priceScale(d.sma20 as number);
      })
      .defined(d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20)));
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  const afterSma50Line = useMemo<Line<ProcessedStockDataPoint> | null>(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;

    return line<ProcessedStockDataPoint>()
      .x((d, i) => scales.xScale(stockData.length + i) ?? 0)
      .y(d => {
        if (d.sma50 === null || d.sma50 === undefined || isNaN(Number(d.sma50))) {
          return NaN;
        }
        return scales.priceScale(d.sma50 as number);
      })
      .defined(d => d.sma50 !== null && d.sma50 !== undefined && !isNaN(Number(d.sma50)));
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

