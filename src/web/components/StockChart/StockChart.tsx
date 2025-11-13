/**
 * @fileoverview Main StockChart component combining hooks and renderers.
 * @module src/web/components/StockChart/StockChart.tsx
 * @dependencies React, d3-scale, ./types, ./config, ./hooks/useChartData, ./hooks/useChartScale, ./hooks/useChartInteraction, ./components/*
 */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChartType } from "@breakout-study-tool/shared";
import { getChartConfig } from "./config";
import type { Dimensions, StockChartProps } from "./types";
import { useChartData } from "./hooks/useChartData";
import { useChartScale } from "./hooks/useChartScale";
import { useChartInteraction } from "./hooks/useChartInteraction";
import { PriceChart } from "./components/PriceChart";
import { MovingAverages } from "./components/MovingAverages";
import { VolumeChart } from "./components/VolumeChart";
import { ChartAxis } from "./components/ChartAxis";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

function useDimensions(
  ref: React.RefObject<HTMLDivElement | null>,
  chartType: ChartType,
  requestedHeight: number | null | undefined,
  padding: Dimensions["margin"],
): Dimensions | null {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const compute = () => {
      const width = element.clientWidth || 0;
      const baseHeight = typeof requestedHeight === "number" ? requestedHeight : element.clientHeight;
      const height = Math.max(baseHeight || 0, chartType === "previous" ? 360 : 420);
      const innerWidth = Math.max(width - padding.left - padding.right, 0);
      const innerHeight = Math.max(height - padding.top - padding.bottom, 0);

      setDimensions({
        width,
        height,
        innerWidth,
        innerHeight,
        margin: padding,
      });
    };

    compute();

    const observer = new ResizeObserver(compute);
    observer.observe(element);
    window.addEventListener("orientationchange", compute);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", compute);
    };
  }, [ref, requestedHeight, padding, chartType]);

  return dimensions;
}

const StockChart: React.FC<StockChartProps> = ({
  data,
  afterData,
  showSMA = true,
  includeAuth,
  chartType = "default",
  height,
  backgroundColor,
  showAfterAnimation = false,
  progressPercentage = 0,
  zoomPercentage = 0,
  tightPadding = false,
  onChartClick,
  userSelection,
  targetPoint,
  disabled,
}) => {
  const isMobile = useIsMobile();
  const config = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const margin = useMemo(() => {
    if (tightPadding) {
      return { ...config.PADDING, left: 24, right: 8, top: 12, bottom: 20 };
    }
    return config.PADDING;
  }, [config, tightPadding]);

  const dimensions = useDimensions(containerRef, chartType, height ?? null, margin);

  const summary = useChartData({
    data,
    afterData,
    chartType,
    progressPercentage,
    showAfterAnimation,
  });

  const { scales, showVolume } = useChartScale({
    summary,
    config,
    dimensions,
    chartType,
    zoomPercentage,
    tightPadding,
    showAfterAnimation,
  });

  const interactionHandlers = useChartInteraction({
    summary,
    scales,
    dimensions,
    onChartClick,
    disabled,
    containerRef,
  });

  const shouldRenderContent = Boolean(scales && dimensions && summary.candles.length);

  return (
    <div
      ref={containerRef}
      className="stock-chart-container"
      style={{
        position: "relative",
        width: "100%",
        height: height ?? "100%",
        minHeight: "360px",
        backgroundColor: backgroundColor ?? config.BACKGROUND,
        borderRadius: "0.75rem",
        overflow: "hidden",
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {shouldRenderContent && scales && dimensions ? (
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={interactionHandlers.handleChartClick}
          onMouseMove={interactionHandlers.handleMouseMove}
          onMouseLeave={interactionHandlers.handleMouseLeave}
          onTouchStart={interactionHandlers.handleTouchStart}
          onTouchMove={interactionHandlers.handleTouchMove}
          onTouchEnd={interactionHandlers.handleTouchEnd}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          <g transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}>
            <ChartAxis scales={scales} config={config} />

            {showSMA && (
              <MovingAverages summary={summary} scales={scales} config={config} />
            )}

            <PriceChart
              summary={summary}
              scales={scales}
              config={config}
              showAfterAnimation={showAfterAnimation}
              shouldShowAfterMask={summary.shouldShowAfterMask}
              userSelection={userSelection}
              targetPoint={targetPoint}
            />

            <VolumeChart summary={summary} scales={scales} config={config} showVolume={showVolume} />
          </g>
        </svg>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs text-white/60"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          Loading chart…
        </div>
      )}
    </div>
  );
};

export default React.memo(StockChart);
