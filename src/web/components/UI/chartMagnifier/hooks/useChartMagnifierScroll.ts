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
  magnifierRef: React.RefObject<HTMLDivElement | null>;
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
  // CRITICAL: Skip this during dragging to prevent conflicts with direct DOM manipulation
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current || isScrolling) return;

    // Skip if currently dragging - touch handler updates DOM directly
    if (isDraggingMagnifierWidgetRef.current) return;

    const selectionBounds = getSelectionAreaBounds(chartElement);
    if (!selectionBounds) return;

    const renderPos = getMagnifierRenderPosition(targetPosition, selectionBounds, magnifierSize);

    // Use left/top for positioning (transform is used for scale in MagnifierWidget)
    magnifierRef.current.style.left = `${selectionBounds.left + renderPos.x}px`;
    magnifierRef.current.style.top = `${selectionBounds.top + renderPos.y}px`;
  }, [targetPosition, enabled, isMobile, chartElement, isScrolling, magnifierSize, magnifierRef]);

  // Refs to avoid stale closures
  const targetPositionRef = useRef(targetPosition);
  const magnifierSizeRef = useRef(magnifierSize);

  // Keep refs updated
  useEffect(() => {
    targetPositionRef.current = targetPosition;
    magnifierSizeRef.current = magnifierSize;
  }, [targetPosition, magnifierSize]);

  // Update position directly via DOM for smoother scrolling
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current) return;

    let rafId: number | null = null;
    let isScrollingActive = false;
    let cachedBounds: ReturnType<typeof getSelectionAreaBounds> | null = null;
    let boundsCacheTime = 0;
    let lastLeft = 0;
    let lastTop = 0;
    const BOUNDS_CACHE_DURATION = 16; // Cache bounds for one frame

    // Continuous RAF loop for smooth scrolling
    const rafLoop = () => {
      if (!isScrollingActive || isDraggingMagnifierWidgetRef.current) {
        rafId = null;
        return;
      }

      if (magnifierRef.current && chartElement) {
        const now = performance.now();
        
        // Cache bounds to avoid repeated DOM queries (only recalculate every frame)
        if (!cachedBounds || (now - boundsCacheTime) > BOUNDS_CACHE_DURATION) {
          cachedBounds = getSelectionAreaBounds(chartElement);
          boundsCacheTime = now;
        }

        if (cachedBounds) {
          const renderPos = getMagnifierRenderPosition(
            targetPositionRef.current,
            cachedBounds,
            magnifierSizeRef.current
          );

          // Use left/top for positioning (transform is used for scale in MagnifierWidget)
          // Direct DOM manipulation for maximum performance
          const left = cachedBounds.left + renderPos.x;
          const top = cachedBounds.top + renderPos.y;
          
          // Only update if position actually changed to avoid unnecessary repaints
          // Use cached values instead of reading from DOM to avoid layout thrashing
          if (Math.abs(lastLeft - left) > 0.5 || Math.abs(lastTop - top) > 0.5) {
            magnifierRef.current.style.left = `${left}px`;
            magnifierRef.current.style.top = `${top}px`;
            lastLeft = left;
            lastTop = top;
          }
        }
      }

      rafId = requestAnimationFrame(rafLoop);
    };

    const startScrolling = () => {
      if (isDraggingMagnifierWidgetRef.current) return;

      // Invalidate bounds cache on scroll/resize
      cachedBounds = null;
      boundsCacheTime = 0;

      if (!isScrollingActive) {
        isScrollingActive = true;
        setIsScrolling(true);
        if (rafId === null) {
          rafId = requestAnimationFrame(rafLoop);
        }
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingActive = false;
        setIsScrolling(false);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }, 150);
    };

    window.addEventListener('scroll', startScrolling, { passive: true });
    window.addEventListener('resize', startScrolling, { passive: true });

    const parentElements: HTMLElement[] = [];
    let parent = chartElement.parentElement;
    while (parent && parent !== document.body) {
      parentElements.push(parent);
      parent.addEventListener('scroll', startScrolling, { passive: true });
      parent = parent.parentElement;
    }

    return () => {
      isScrollingActive = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      window.removeEventListener('scroll', startScrolling);
      window.removeEventListener('resize', startScrolling);

      parentElements.forEach(parentEl => {
        parentEl.removeEventListener('scroll', startScrolling);
      });
    };
  }, [enabled, isMobile, chartElement, targetPosition, magnifierSize, magnifierRef]);

  return {
    isScrolling,
  };
}

