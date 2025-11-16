/**
 * @fileoverview Hook for managing chart interactions including magnifier and tooltips.
 * @module src/web/components/ChartSection/hooks/useChartInteraction.ts
 * @dependencies React
 */
"use client";

import { useEffect, useRef, useCallback } from "react";

export interface UseChartInteractionOptions {
  orderedFiles: unknown[] | null | undefined;
  afterData: unknown;
  onChartClick: ((coordinates: { x: number; y: number; chartX: number; chartY: number }) => void) | null;
  disabled: boolean;
  score: number | null;
  isTimeUp: boolean;
}

export interface UseChartInteractionReturn {
  chartRef: React.RefObject<(HTMLDivElement & { handleChartClick?: (event: { clientX: number; clientY: number }) => void }) | null>;
  handleChartAreaClickCapture: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMagnifierSelection: (syntheticEvent: any) => void;
  mainDataLength: number;
}

export function useChartInteraction({
  orderedFiles,
  afterData,
  onChartClick,
  disabled,
  score,
  isTimeUp,
}: UseChartInteractionOptions): UseChartInteractionReturn {
  const chartRef = useRef<HTMLDivElement & { handleChartClick?: (event: { clientX: number; clientY: number }) => void }>(null);

  // Find chart container element for magnifier
  useEffect(() => {
    const findChartContainer = (): void => {
      const container = document.querySelector('.stock-chart-container') as HTMLDivElement | null;
      if (container) {
        chartRef.current = container as HTMLDivElement & { handleChartClick?: (event: { clientX: number; clientY: number }) => void };
      }
    };
    
    const timeout = setTimeout(findChartContainer, 100);
    const timeout2 = setTimeout(findChartContainer, 500);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [orderedFiles, afterData]);

  const handleChartAreaClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    if (isTimeUp && score === null) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, [isTimeUp, score]);

  const handleMagnifierSelection = useCallback((syntheticEvent: any) => {
    if (chartRef.current && chartRef.current.handleChartClick) {
      try {
        const event = {
          clientX: syntheticEvent.clientX,
          clientY: syntheticEvent.clientY,
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        chartRef.current.handleChartClick(event);
      } catch (error) {
        console.error('[ChartSection] Error calling handleChartClick:', error);
      }
    } else {
      if (chartRef.current) {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
          try {
            const clickEvent = new MouseEvent('click', {
              bubbles: false,
              cancelable: false,
              composed: true,
              view: window,
              clientX: syntheticEvent.clientX,
              clientY: syntheticEvent.clientY,
            });
            svgElement.dispatchEvent(clickEvent);
          } catch (fallbackError) {
            console.error('[ChartSection] Fallback also failed:', fallbackError);
          }
        }
      }
    }
  }, []);

  const mainDataLength = orderedFiles && orderedFiles[0] && Array.isArray((orderedFiles[0] as any).data) 
    ? (orderedFiles[0] as any).data.length 
    : 0;

  return {
    chartRef,
    handleChartAreaClickCapture,
    handleMagnifierSelection,
    mainDataLength,
  };
}

