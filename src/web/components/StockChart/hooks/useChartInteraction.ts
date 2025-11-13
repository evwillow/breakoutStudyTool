/**
 * @fileoverview Interaction handlers for StockChart.
 * @module src/web/components/StockChart/hooks/useChartInteraction.ts
 * @dependencies React, ../types, @breakout-study-tool/shared
 */

import { useCallback, useEffect } from "react";
import type React from "react";
import type { ChartClickHandler, ChartCoordinate } from "@breakout-study-tool/shared";
import type { ChartDataSummary, ChartScales, Dimensions, InteractionHandlers } from "../types";

interface UseChartInteractionOptions {
  summary: ChartDataSummary;
  scales: ChartScales | null;
  dimensions: Dimensions | null;
  onChartClick?: ChartClickHandler | null;
  disabled?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function mapEventToCoordinate(
  event: { clientX: number; clientY: number },
  scales: ChartScales,
  dimensions: Dimensions,
  summary: ChartDataSummary,
): ChartCoordinate | null {
  const svgElement = (event as any).currentTarget as SVGSVGElement | undefined;
  const target = svgElement ?? document.elementFromPoint(event.clientX, event.clientY);
  if (!target || !(target instanceof SVGElement)) {
    return null;
  }

  const svgRect = target.getBoundingClientRect();
  const relativeX = event.clientX - svgRect.left - dimensions.margin.left;
  const relativeY = event.clientY - svgRect.top - dimensions.margin.top;

  const priceValueRaw = scales.priceScale.invert(relativeY);
  const [domainMin, domainMax] = scales.priceScale.domain();
  const priceValue = Math.min(Math.max(priceValueRaw, Math.min(domainMin, domainMax)), Math.max(domainMin, domainMax));

  const domain = scales.xScale.domain();
  if (!domain.length) {
    return null;
  }

  let closestIndex = domain[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  domain.forEach((index) => {
    const position = scales.xScale(index);
    if (typeof position !== "number") {
      return;
    }
    const distance = Math.abs(position - relativeX);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  const mainCount = summary.candles.length;
  const isMain = closestIndex < mainCount;
  const source = isMain
    ? summary.candles[closestIndex]
    : summary.visibleAfterCandles[closestIndex - mainCount] ?? summary.afterCandles[closestIndex - mainCount];

  if (!source) {
    return null;
  }

  return {
    x: closestIndex,
    y: priceValue,
    chartX: relativeX,
    chartY: relativeY,
  };
}

export function useChartInteraction({
  summary,
  scales,
  dimensions,
  onChartClick,
  disabled,
  containerRef,
}: UseChartInteractionOptions): InteractionHandlers {
  const handleCoordinate = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!onChartClick || disabled || !scales || !dimensions) {
        return;
      }
      const coordinate = mapEventToCoordinate(event, scales, dimensions, summary);
      if (coordinate) {
        onChartClick(coordinate);
      }
    },
    [onChartClick, disabled, scales, dimensions, summary],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    (container as any).handleChartClick = handleCoordinate;
    return () => {
      if (container) {
        delete (container as any).handleChartClick;
      }
    };
  }, [containerRef, handleCoordinate]);

  const handleChartClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!onChartClick) return;
      handleCoordinate(event);
    },
    [handleCoordinate, onChartClick],
  );

  const handleMouseMove = useCallback(() => {}, []);
  const handleMouseLeave = useCallback(() => {}, []);
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<SVGSVGElement>) => {
      if (!onChartClick || disabled || !event.touches.length) return;
      handleCoordinate(event.touches[0]);
    },
    [handleCoordinate, onChartClick, disabled],
  );
  const handleTouchMove = useCallback(() => {}, []);
  const handleTouchEnd = useCallback(() => {}, []);

  return {
    handleChartClick,
    handleMouseMove,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
