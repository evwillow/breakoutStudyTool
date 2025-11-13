/**
 * @fileoverview Hook for managing chart magnifier scroll synchronization.
 * @module src/web/components/UI/chartMagnifier/hooks/useChartMagnifierScroll.ts
 * @dependencies React, ../utils/magnifierUtils
 */
"use client";

import { useState, useEffect, useRef } from 'react';
import {
  getSelectionAreaBounds,
  getMagnifierRenderPosition,
  type Position,
} from '../utils/magnifierUtils';

interface UseChartMagnifierScrollProps {
  enabled: boolean;
  isMobile: boolean;
  chartElement: HTMLElement | null;
  magnifierRef: React.RefObject<HTMLDivElement>;
  targetPosition: Position;
  magnifierRenderPos: Position;
  magnifierSize: number;
  isDraggingMagnifierWidget: boolean;
}

interface UseChartMagnifierScrollReturn {
  isScrolling: boolean;
}

export function useChartMagnifierScroll({
  enabled,
  isMobile,
  chartElement,
  magnifierRef,
  targetPosition,
  magnifierRenderPos,
  magnifierSize,
  isDraggingMagnifierWidget,
}: UseChartMagnifierScrollProps): UseChartMagnifierScrollReturn {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingMagnifierWidgetRef = useRef(isDraggingMagnifierWidget);

  // Keep ref updated
  useEffect(() => {
    isDraggingMagnifierWidgetRef.current = isDraggingMagnifierWidget;
  }, [isDraggingMagnifierWidget]);

  // Sync position when targetPosition changes (user interaction)
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current || isScrolling) return;

    const selectionBounds = getSelectionAreaBounds(chartElement);
    if (!selectionBounds) return;

    const renderPos = isDraggingMagnifierWidgetRef.current
      ? magnifierRenderPos
      : getMagnifierRenderPosition(targetPosition, selectionBounds, magnifierSize);

    magnifierRef.current.style.left = `${selectionBounds.left + renderPos.x}px`;
    magnifierRef.current.style.top = `${selectionBounds.top + renderPos.y}px`;
  }, [targetPosition, enabled, isMobile, chartElement, isScrolling, magnifierRenderPos, magnifierSize, magnifierRef]);

  // Update position directly via DOM for smoother scrolling
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current) return;

    let rafId: number | null = null;

    const updatePosition = () => {
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (magnifierRef.current && chartElement) {
            const selectionBounds = getSelectionAreaBounds(chartElement);
            if (selectionBounds) {
              const renderPos = isDraggingMagnifierWidgetRef.current
                ? magnifierRenderPos
                : getMagnifierRenderPosition(targetPosition, selectionBounds, magnifierSize);

              magnifierRef.current.style.left = `${selectionBounds.left + renderPos.x}px`;
              magnifierRef.current.style.top = `${selectionBounds.top + renderPos.y}px`;
            }
          }
          rafId = null;
        });
      }
    };

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    const parentElements: HTMLElement[] = [];
    let parent = chartElement.parentElement;
    while (parent && parent !== document.body) {
      parentElements.push(parent);
      parent.addEventListener('scroll', updatePosition, { passive: true });
      parent = parent.parentElement;
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);

      parentElements.forEach(parentEl => {
        parentEl.removeEventListener('scroll', updatePosition);
      });
    };
  }, [enabled, isMobile, chartElement, targetPosition, magnifierRenderPos, magnifierSize, magnifierRef]);

  return {
    isScrolling,
  };
}

