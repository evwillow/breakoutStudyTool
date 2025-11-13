/**
 * @fileoverview Chart magnifier component for selecting points on the stock chart.
 * @module src/web/components/UI/chartMagnifier/ChartMagnifier.tsx
 * @dependencies React, hooks, components, utils
 */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useChartMagnifierBounds } from './hooks/useChartMagnifierBounds';
import { useChartMagnifierPosition } from './hooks/useChartMagnifierPosition';
import { useChartMagnifierTouch } from './hooks/useChartMagnifierTouch';
import { useChartMagnifierScroll } from './hooks/useChartMagnifierScroll';
import MagnifierWidget from './components/MagnifierWidget';
import { isInSelectableArea as checkIsInSelectableArea } from './utils/magnifierUtils';

interface ChartMagnifierProps {
  onSelection: ((event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void }) => void) | null;
  enabled?: boolean;
  magnifierSize?: number;
  zoomLevel?: number;
  chartElement?: HTMLElement | null;
  mainDataLength?: number;
}

const ChartMagnifier: React.FC<ChartMagnifierProps> = ({
  onSelection,
  enabled = true,
  magnifierSize = 160,
  zoomLevel = 2.5,
  chartElement = null,
  mainDataLength = 0,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const magnifierRef = useRef<HTMLDivElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      const mobile = isSmallScreen && hasTouch;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Get bounds
  const { selectionBounds, isInSelectableArea } = useChartMagnifierBounds({
    chartElement,
    mainDataLength,
  });

  // Get position state
  const {
    targetPosition,
    magnifierRenderPos,
    hasBeenPositioned,
    setTargetPosition,
    setMagnifierRenderPos,
    targetPositionRef,
  } = useChartMagnifierPosition({
    chartElement,
    isMobile,
    selectionBounds,
    mainDataLength,
    magnifierSize,
  });

  // Get touch interactions
  const {
    isDragging,
    isDraggingMagnifierWidget,
    setIsDragging,
    setIsDraggingMagnifierWidget,
  } = useChartMagnifierTouch({
    enabled,
    isMobile,
    magnifierRef,
    chartElement,
    selectionBounds,
    mainDataLength,
    magnifierSize,
    targetPosition,
    magnifierRenderPos,
    setTargetPosition,
    setMagnifierRenderPos,
    targetPositionRef,
    onSelection,
  });

  // Get scroll synchronization
  const { isScrolling } = useChartMagnifierScroll({
    enabled,
    isMobile,
    chartElement,
    magnifierRef,
    targetPosition,
    magnifierRenderPos,
    magnifierSize,
    isDraggingMagnifierWidget,
  });

  // Block chart touch events on mobile only in selectable area
  useEffect(() => {
    if (!enabled || !chartElement || !isMobile) return;

    const handleChartClick = (e: MouseEvent) => {
      const inSelectableArea = checkIsInSelectableArea(e.clientX, chartElement, mainDataLength);
      if (inSelectableArea) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleChartTouch = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;

      const touch = e.touches[0];
      const inSelectableArea = checkIsInSelectableArea(touch.clientX, chartElement, mainDataLength);

      if (inSelectableArea) {
        if (e.cancelable !== false) {
          e.preventDefault();
        }
        e.stopPropagation();
      }
    };

    chartElement.addEventListener('click', handleChartClick, { passive: false });
    chartElement.addEventListener('touchstart', handleChartTouch, { passive: false });

    return () => {
      chartElement.removeEventListener('click', handleChartClick);
      chartElement.removeEventListener('touchstart', handleChartTouch);
    };
  }, [enabled, chartElement, isMobile, mainDataLength]);

  // Don't show on desktop
  if (!enabled || !isMobile) {
    return null;
  }

  if (!selectionBounds || !chartElement) return null;

  return (
    <MagnifierWidget
      magnifierRef={magnifierRef}
      selectionBounds={selectionBounds}
      targetPosition={targetPosition}
      magnifierRenderPos={magnifierRenderPos}
      magnifierSize={magnifierSize}
      isDragging={isDragging}
      isScrolling={isScrolling}
      isDraggingMagnifierWidget={isDraggingMagnifierWidget}
    />
  );
};

export default ChartMagnifier;

