import { useMemo } from "react";
import type {
  CandlestickData,
  ChartType,
  ChartDimensions,
  ChartScales,
  ProcessedStockDataPoint,
  VolumeBarData
} from "../StockChart.types";

interface UseChartGeometryParams {
  scales: ChartScales | null;
  stockData: ProcessedStockDataPoint[];
  afterStockData: ProcessedStockDataPoint[];
  visibleAfterData: ProcessedStockDataPoint[];
  dimensions: ChartDimensions | null;
  zoomPercentage: number;
  showAfterAnimation: boolean;
  chartType: ChartType;
}

interface UseChartGeometryResult {
  candlesticks: CandlestickData[];
  afterCandlesticks: CandlestickData[];
  volumeBars: VolumeBarData[];
  afterVolumeBars: VolumeBarData[];
}

const FALLBACK_WIDTH = 6;
const MIN_HEIGHT = 1;

export const useChartGeometry = ({
  scales,
  stockData,
  afterStockData,
  visibleAfterData,
  dimensions,
  zoomPercentage,
  showAfterAnimation,
  chartType
}: UseChartGeometryParams): UseChartGeometryResult => {
  const candlesticks = useMemo<CandlestickData[]>(() => {
    if (!scales || stockData.length === 0 || !dimensions) {
      return [];
    }

    if (!scales.xScale || !scales.priceScale) {
      console.warn("Scales not properly initialized, skipping candlestick generation");
      return [];
    }

    const totalCount = scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length;
    const denominator = totalCount || 1;

    return stockData
      .map((d, i) => {
        const getPrice = (item: ProcessedStockDataPoint, props: string[]): number | null => {
          for (const prop of props) {
            if (item[prop] !== undefined && item[prop] !== null) {
              const val = parseFloat(String(item[prop]));
              return isNaN(val) ? null : val;
            }
          }
          return null;
        };

        const open = getPrice(d, ["open", "Open", "OPEN"]);
        const high = getPrice(d, ["high", "High", "HIGH"]);
        const low = getPrice(d, ["low", "Low", "LOW"]);
        const close = getPrice(d, ["close", "Close", "CLOSE"]);

        if (open === null || high === null || low === null || close === null) {
          if (i === 0) console.warn("Missing price data on first point:", d);
          return null;
        }

        const isTooSmall = open <= 0.0001 && high <= 0.0001 && low <= 0.0001 && close <= 0.0001;
        if (isTooSmall) {
          if (i === 0) console.warn("Values too small on data point, likely bad data:", { open, high, low, close });
          return null;
        }

        if (Math.abs(high - low) < 0.0001) {
          if (i === 0) console.warn("High and low are identical, skipping point");
          return null;
        }

        try {
          const x = scales.xScale(i);
          const fallbackX = i * (dimensions.innerWidth / denominator);
          const finalX = x === undefined || isNaN(x) ? fallbackX : x;

          const stepWidth = scales.xScale.step() * 0.8;
          const width = stepWidth || FALLBACK_WIDTH;
          const openY = scales.priceScale(open);
          const closeY = scales.priceScale(close);
          const highY = scales.priceScale(high);
          const lowY = scales.priceScale(low);
          const isUp = close > open;

          if ([openY, closeY, highY, lowY].some(value => isNaN(value))) {
            return null;
          }

          return {
            x: finalX,
            openY,
            closeY,
            highY,
            lowY,
            width,
            isUp
          };
        } catch (err) {
          console.error(`Error generating candlestick for index ${i}:`, err);
          return null;
        }
      })
      .filter((item): item is CandlestickData => item !== null);
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length]);

  const volumeBars = useMemo<VolumeBarData[]>(() => {
    if (!scales || stockData.length === 0 || !dimensions) {
      return [];
    }

    const totalCount = scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length;
    const denominator = totalCount || 1;

    return stockData
      .map((d, i) => {
        const getVolume = (item: ProcessedStockDataPoint): number | null => {
          for (const prop of ["volume", "Volume", "VOLUME"]) {
            if (item[prop] !== undefined && item[prop] !== null) {
              const val = parseFloat(String(item[prop]));
              return isNaN(val) ? null : val;
            }
          }
          return null;
        };

        const volume = getVolume(d);
        if (volume === null) {
          return null;
        }

        try {
          const x = scales.xScale(i);
          const fallbackX = i * (dimensions.innerWidth / denominator);
          const finalX = x === undefined || isNaN(x) ? fallbackX : x;

          const width = scales.xScale.step() * 0.8 || FALLBACK_WIDTH;
          const topY = scales.volumeScale(volume);
          if (isNaN(topY)) return null;

          let barHeight = scales.volumeHeight - topY;

          if (chartType === "previous") {
            const targetBottom = scales.volumeHeight;
            const actualBottom = topY + barHeight;
            if (actualBottom < targetBottom - 0.1) {
              barHeight = targetBottom - topY;
            }
          }

          return {
            x: finalX - width / 2,
            y: topY,
            width,
            height: barHeight
          };
        } catch (err) {
          console.error(`Error generating volume bar for index ${i}:`, err);
          return null;
        }
      })
      .filter((item): item is VolumeBarData => item !== null);
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length, chartType]);

  const afterCandlesticks = useMemo<CandlestickData[]>(() => {
    if (
      !scales ||
      !scales.isZoomedOut ||
      !showAfterAnimation ||
      visibleAfterData.length === 0 ||
      !dimensions ||
      stockData.length === 0
    ) {
      return [];
    }

    const totalCount = stockData.length + afterStockData.length;
    const denominator = totalCount || 1;
    const offset = stockData.length;

    return visibleAfterData
      .map((d, i) => {
        const getPrice = (item: ProcessedStockDataPoint, props: string[]): number | null => {
          for (const prop of props) {
            if (item[prop] !== undefined && item[prop] !== null) {
              const val = parseFloat(String(item[prop]));
              return isNaN(val) ? null : val;
            }
          }
          return null;
        };

        const open = getPrice(d, ["open", "Open", "OPEN"]);
        const high = getPrice(d, ["high", "High", "HIGH"]);
        const low = getPrice(d, ["low", "Low", "LOW"]);
        const close = getPrice(d, ["close", "Close", "CLOSE"]);

        if (open === null || high === null || low === null || close === null) {
          return null;
        }

        const isTooSmall = open <= 0.0001 && high <= 0.0001 && low <= 0.0001 && close <= 0.0001;
        if (isTooSmall) {
          return null;
        }

        if (Math.abs(high - low) < 0.0001) {
          return null;
        }

        const index = offset + i;

        try {
          const x = scales.xScale(index);
          const fallbackX = index * (dimensions.innerWidth / denominator);
          const finalX = x === undefined || isNaN(x) ? fallbackX : x;

          const width = scales.xScale.step() * 0.8 || FALLBACK_WIDTH;
          const openY = scales.priceScale(open);
          const closeY = scales.priceScale(close);
          const highY = scales.priceScale(high);
          const lowY = scales.priceScale(low);
          const isUp = close > open;

          if ([openY, closeY, highY, lowY].some(value => isNaN(value))) {
            return null;
          }

          return {
            x: finalX,
            openY,
            closeY,
            highY,
            lowY,
            width,
            isUp
          };
        } catch (err) {
          console.error(`Error generating after candlestick for index ${i}:`, err);
          return null;
        }
      })
      .filter((item): item is CandlestickData => item !== null);
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, afterStockData.length]);

  const afterVolumeBars = useMemo<VolumeBarData[]>(() => {
    if (
      !scales ||
      !scales.isZoomedOut ||
      !showAfterAnimation ||
      visibleAfterData.length === 0 ||
      !dimensions ||
      stockData.length === 0
    ) {
      return [];
    }

    const totalCount = stockData.length + afterStockData.length;
    const denominator = totalCount || 1;
    const offset = stockData.length;

    return visibleAfterData
      .map((d, i) => {
        const getVolume = (item: ProcessedStockDataPoint): number | null => {
          for (const prop of ["volume", "Volume", "VOLUME"]) {
            if (item[prop] !== undefined && item[prop] !== null) {
              const val = parseFloat(String(item[prop]));
              return isNaN(val) ? null : val;
            }
          }
          return null;
        };

        const volume = getVolume(d);
        if (volume === null) {
          return null;
        }

        try {
          const index = offset + i;
          const x = scales.xScale(index);
          const fallbackX = index * (dimensions.innerWidth / denominator);
          const finalX = x === undefined || isNaN(x) ? fallbackX : x;

          const width = scales.xScale.step() * 0.8 || FALLBACK_WIDTH;
          const height = scales.volumeScale(volume);
          if (isNaN(height)) return null;

          return {
            x: finalX - width / 2,
            y: scales.volumeHeight - height,
            width,
            height
          };
        } catch (err) {
          console.error(`Error generating after volume bar for index ${i}:`, err);
          return null;
        }
      })
      .filter((item): item is VolumeBarData => item !== null);
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, afterStockData.length]);

  return {
    candlesticks,
    afterCandlesticks,
    volumeBars,
    afterVolumeBars
  };
};

